import { repairTruncatedJSON } from "./heal";

export interface APIResponse {
  content?: string;
  finish_reason?: "length" | "stop" | "end_turn";
  usage?: { input_tokens: number; output_tokens: number };
}

export type TruncationReason = "length" | "malformed_json" | "max_retries";

export interface TruncationDetectionResult {
  isTruncated: boolean;
  reason?: "length" | "malformed_json";
}

export interface TruncationErrorContext {
  attemptCount?: number;
  lastAttemptRange?: { start: number; end: number };
}

export interface TruncationError {
  location: string;
  reason: TruncationReason;
  message: string;
  context?: TruncationErrorContext;
}

export interface RetryOptions {
  content: string;
  maxRetries: number;
  onRetry?: (attempt: number, range: { start: number; end: number }) => void;
}

export interface RetryResult {
  success: boolean;
  data?: unknown;
  error?: TruncationError | null;
}

/**
 * Checks brace/bracket/quote balance before confirming with JSON.parse,
 * so malformed content is flagged without relying solely on a parse
 * exception.
 */
export function isValidJSON(content: string): boolean {
  if (!content) return false;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (const ch of content) {
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{" || ch === "[") {
      depth++;
    } else if (ch === "}" || ch === "]") {
      depth--;
      if (depth < 0) return false;
    }
  }

  if (inString || depth !== 0) return false;

  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detects truncation before any real parsing of the response is attempted:
 * finish_reason='length' means the model ran out of tokens; otherwise an
 * unbalanced/malformed content body signals a cut-off response.
 */
export function detectTruncation(response: APIResponse): TruncationDetectionResult {
  if (response.finish_reason === "length") {
    return { isTruncated: true, reason: "length" };
  }

  if (!response.content) {
    return { isTruncated: false };
  }

  if (!isValidJSON(response.content)) {
    return { isTruncated: true, reason: "malformed_json" };
  }

  return { isTruncated: false };
}

export function createTruncationError(
  location: string,
  reason: TruncationReason,
  context?: TruncationErrorContext,
): TruncationError {
  const messages: Record<TruncationReason, string> = {
    length: "토큰 한도(token limit)에 도달해 응답이 잘렸습니다. 더 작은 범위로 다시 요청하세요.",
    malformed_json: "응답 JSON의 중괄호/대괄호 균형이 맞지 않아 파싱할 수 없습니다.",
    max_retries: "최대 재시도(retry) 횟수를 초과했습니다 — 더 작은 범위로도 복구하지 못했습니다.",
  };

  return {
    location,
    reason,
    message: messages[reason],
    context,
  };
}

/**
 * Re-requests a truncated chunk with progressively narrower ranges instead
 * of crashing the pipeline. Each narrowed slice is run through the JSON
 * healer; if it never recovers within maxRetries, a structured error is
 * returned (never thrown) so the caller can fail that chunk in isolation.
 */
export async function retryWithSmallerRange(options: RetryOptions): Promise<RetryResult> {
  try {
    const { content, maxRetries, onRetry } = options;

    if (isValidJSON(content)) {
      return { success: true, data: JSON.parse(content), error: undefined };
    }

    let lastRange = { start: 0, end: content.length };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const step = Math.max(1, Math.ceil(content.length / (maxRetries + 1)));
      const end = Math.max(1, content.length - step * attempt);
      const range = { start: 0, end };
      lastRange = range;

      try {
        onRetry?.(attempt, range);
      } catch {
        // Silently ignore callback errors
      }

      const repaired = repairTruncatedJSON(content.slice(range.start, range.end));
      if (repaired !== null) {
        return { success: true, data: repaired, error: undefined };
      }
    }

    return {
      success: false,
      error: createTruncationError("retry_with_smaller_range", "max_retries", {
        attemptCount: maxRetries,
        lastAttemptRange: lastRange,
      }),
    };
  } catch (error) {
    return {
      success: false,
      error: createTruncationError("retry_with_smaller_range", "max_retries", {
        attemptCount: options.maxRetries,
        lastAttemptRange: { start: 0, end: options.content.length },
      }),
    };
  }
}
