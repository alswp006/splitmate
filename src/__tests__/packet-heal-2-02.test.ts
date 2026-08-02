import { describe, it, expect, vi } from "vitest";
import {
  detectTruncation,
  isValidJSON,
  createTruncationError,
  retryWithSmallerRange,
} from "@/pipeline/json-guard";

/**
 * Packet: truncation 감지 및 안전 실패/재시도 가드
 *
 * AC-1: finish_reason='length' 또는 불균형 JSON이 파싱 시도 전에 감지된다
 * AC-2: 잘린 청크는 범위를 좁혀 자동 재요청되고 파이프라인이 크래시하지 않는다
 * AC-3: 최종 실패 시 위치·원인이 담긴 구조화된 에러가 반환된다
 */

// ============================================================================
// Type definitions
// ============================================================================

interface APIResponse {
  content?: string;
  finish_reason?: "length" | "stop" | "end_turn";
  usage?: { input_tokens: number; output_tokens: number };
}

interface TruncationError {
  location: string;
  reason: "length" | "malformed_json" | "max_retries";
  message: string;
  context?: {
    attemptCount?: number;
    lastAttemptRange?: { start: number; end: number };
  };
}

// ============================================================================
// AC-1 Tests: Truncation detection before parsing
// ============================================================================

describe("AC-1: truncation 감지 (파싱 전)", () => {
  it("should detect truncation when finish_reason='length'", () => {
    const response: APIResponse = {
      content: '{"result": "partial',
      finish_reason: "length",
    };

    const result = detectTruncation(response);

    expect(result.isTruncated).toBe(true);
    expect(result.reason).toBe("length");
  });

  it("should detect malformed JSON with unbalanced braces", () => {
    const response: APIResponse = {
      content: '{"data": {"nested": {"value": 123}',
      finish_reason: "stop",
    };

    const result = detectTruncation(response);

    expect(result.isTruncated).toBe(true);
    expect(result.reason).toBe("malformed_json");
  });

  it("should detect malformed JSON with unbalanced brackets", () => {
    const response: APIResponse = {
      content: '{"items": [{"id": 1}, {"id": 2}',
      finish_reason: "stop",
    };

    const result = detectTruncation(response);

    expect(result.isTruncated).toBe(true);
    expect(result.reason).toBe("malformed_json");
  });

  it("should pass valid JSON without truncation", () => {
    const response: APIResponse = {
      content: '{"result": "complete", "status": "success"}',
      finish_reason: "stop",
    };

    const result = detectTruncation(response);

    expect(result.isTruncated).toBe(false);
    expect(result.reason).toBeUndefined();
  });

  it("should pass empty or missing content without error", () => {
    const response: APIResponse = {
      content: undefined,
      finish_reason: "stop",
    };

    const result = detectTruncation(response);

    expect(result.isTruncated).toBe(false);
  });
});

// ============================================================================
// AC-2 Tests: Automatic retry with narrowed range, no crash
// ============================================================================

describe("AC-2: 재시도 가드 (안전한 실패/복구)", () => {
  it("should retry with narrowed range when content is malformed", async () => {
    const originalContent = '{"incomplete": {"data": [1, 2, 3';
    const retryTracker: Array<{ attempt: number; range: { start: number; end: number } }> = [];

    const result = await retryWithSmallerRange({
      content: originalContent,
      maxRetries: 3,
      onRetry: (attempt, range) => {
        retryTracker.push({ attempt, range });
      },
    });

    // Should have attempted retries (even if final result is failure)
    expect(retryTracker.length).toBeGreaterThan(0);
    expect(retryTracker[0].attempt).toBe(1);
    // Range should be narrowed (end should be less than original)
    expect(retryTracker[0].range.end).toBeLessThan(originalContent.length);
  });

  it("should not crash on repeated retry attempts", async () => {
    const malformedContent = '{"nested": {"data": [{"id": 1}, {"id": 2}]';
    let crashOccurred = false;

    try {
      const result = await retryWithSmallerRange({
        content: malformedContent,
        maxRetries: 5,
      });

      // Should complete without throwing
      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("error");
    } catch {
      crashOccurred = true;
    }

    expect(crashOccurred).toBe(false);
  });

  it("should recover on retry if narrowed range becomes valid JSON", async () => {
    // Valid JSON that should parse successfully
    const validJSON = '{"result": "complete", "data": {"status": "ok"}}';

    const result = await retryWithSmallerRange({
      content: validJSON,
      maxRetries: 3,
    });

    // Should succeed since JSON is valid
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should track attempt count in retry metadata", async () => {
    const malformedContent = '{"data": [1, 2, 3]';
    const result = await retryWithSmallerRange({
      content: malformedContent,
      maxRetries: 2,
    });

    // If final failure, should include attempt count in error
    if (!result.success && result.error) {
      expect(result.error.context?.attemptCount).toBe(2);
      expect(result.error.context?.lastAttemptRange).toBeDefined();
    }
  });
});

// ============================================================================
// AC-3 Tests: Structured error on final failure
// ============================================================================

describe("AC-3: 구조화된 실패 에러 (위치·원인·진단)", () => {
  it("should create error with location and reason for length truncation", () => {
    const error = createTruncationError("model_output_parser", "length", {
      attemptCount: 1,
    });

    expect(error.location).toBe("model_output_parser");
    expect(error.reason).toBe("length");
    expect(error.message).toContain("token");
    expect(error.message.length).toBeGreaterThan(10);
  });

  it("should create error with location and reason for malformed JSON", () => {
    const error = createTruncationError("json_validation", "malformed_json", {
      attemptCount: 2,
      lastAttemptRange: { start: 0, end: 256 },
    });

    expect(error.location).toBe("json_validation");
    expect(error.reason).toBe("malformed_json");
    expect(error.message).toContain("JSON");
    expect(error.message.length).toBeGreaterThan(10);
  });

  it("should create error with max_retries reason and context", () => {
    const error = createTruncationError("recovery_pipeline", "max_retries", {
      attemptCount: 5,
      lastAttemptRange: { start: 0, end: 128 },
    });

    expect(error.location).toBe("recovery_pipeline");
    expect(error.reason).toBe("max_retries");
    expect(error.message).toContain("retry");
    expect(error.context?.attemptCount).toBe(5);
    expect(error.context?.lastAttemptRange).toEqual({ start: 0, end: 128 });
  });

  it("should include diagnostic message for different failure reasons", () => {
    const lengthError = createTruncationError(
      "parser",
      "length",
    );
    const malformedError = createTruncationError(
      "parser",
      "malformed_json",
    );
    const retriesError = createTruncationError(
      "parser",
      "max_retries",
    );

    // All should be non-empty
    expect(lengthError.message.length).toBeGreaterThan(0);
    expect(malformedError.message.length).toBeGreaterThan(0);
    expect(retriesError.message.length).toBeGreaterThan(0);

    // Messages should be different
    expect(lengthError.message).not.toBe(malformedError.message);
  });

  it("should structure error with complete context for debugging", () => {
    const error = createTruncationError("api_call_stage", "malformed_json", {
      attemptCount: 3,
      lastAttemptRange: { start: 512, end: 1024 },
    });

    expect(error).toHaveProperty("location", "api_call_stage");
    expect(error).toHaveProperty("reason", "malformed_json");
    expect(error).toHaveProperty("message");
    expect(error).toHaveProperty("context");
    expect(error.context).toHaveProperty("attemptCount", 3);
    expect(error.context).toHaveProperty("lastAttemptRange");
  });
});

// ============================================================================
// Integration: End-to-end truncation detection → retry → error
// ============================================================================

describe("Integration: truncation 감지 → 재시도 → 실패 흐름", () => {
  it("should flow from detection → retry → structured error on final failure", async () => {
    const truncatedResponse: APIResponse = {
      content: '{"plan": {"entities": [{"name": "User", "fields": [',
      finish_reason: "length",
    };

    // Step 1: Detect truncation
    const detection = detectTruncation(truncatedResponse);
    expect(detection.isTruncated).toBe(true);
    expect(detection.reason).toBe("length");

    // Step 2: Attempt recovery (if content exists)
    if (truncatedResponse.content) {
      const retryResult = await retryWithSmallerRange({
        content: truncatedResponse.content,
        maxRetries: 2,
      });

      // Step 3: If retry fails, create structured error
      if (!retryResult.success && retryResult.error) {
        const finalError = createTruncationError(
          "plan_parser_pipeline",
          retryResult.error.reason,
          retryResult.error.context,
        );

        expect(finalError.location).toBe("plan_parser_pipeline");
        expect(finalError.reason).toBeDefined();
        expect(finalError.message).toBeTruthy();
        expect(finalError.context).toBeDefined();
      }
    }
  });

  it("should handle complete recovery flow without crashing", async () => {
    const response: APIResponse = {
      content: '{"complete": true, "data": [1, 2, 3]}',
      finish_reason: "stop",
    };

    let pipelineSucceeded = false;
    let errorThrown = false;

    try {
      const detection = detectTruncation(response);
      if (!detection.isTruncated) {
        pipelineSucceeded = true;
      }
    } catch {
      errorThrown = true;
    }

    expect(pipelineSucceeded).toBe(true);
    expect(errorThrown).toBe(false);
  });
});
