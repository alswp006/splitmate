import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { saveSession, getSessions, getSession } from "../lib/storage";
import type { SplitSession } from "../lib/types";

describe("localStorage 저장 계층 구현(F1 AC 충족)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  const makeSession = (
    id: string,
    createdAtOverride?: number
  ): SplitSession => ({
    id,
    title: `Split ${id}`,
    members: [{ id: "m1", name: "Member 1" }],
    items: [],
    createdAt: String(createdAtOverride ?? Date.now()),
  });

  // AC-1: 3개 저장 후 4번째 추가시 3개 유지 및 최오래된 항목 제거
  describe("AC-1: FIFO cleanup (max 3 sessions)", () => {
    it("should maintain max 3 sessions after saving 4th", () => {
      const session1 = makeSession("session-1", 1000);
      const session2 = makeSession("session-2", 2000);
      const session3 = makeSession("session-3", 3000);
      const session4 = makeSession("session-4", 4000);

      saveSession(session1);
      saveSession(session2);
      saveSession(session3);
      saveSession(session4);

      const sessions = getSessions();
      expect(sessions).toHaveLength(3);
      expect(sessions.map((s) => s.id)).toEqual([
        "session-2",
        "session-3",
        "session-4",
      ]);
    });

    it("should remove oldest session by createdAt when saving 4th", () => {
      const oldest = makeSession("oldest", 100);
      const middle1 = makeSession("middle-1", 200);
      const middle2 = makeSession("middle-2", 300);
      const newest = makeSession("newest", 400);

      saveSession(oldest);
      saveSession(middle1);
      saveSession(middle2);
      saveSession(newest);

      const sessions = getSessions();
      const ids = sessions.map((s) => s.id);
      expect(ids).not.toContain("oldest");
      expect(ids).toContain("middle-1");
      expect(ids).toContain("middle-2");
      expect(ids).toContain("newest");
    });
  });

  // AC-2: 손상된 값에서 getSessions()가 []를 반환하고 키를 초기화
  describe("AC-2: Corrupted data recovery", () => {
    it("should return empty array and clear key when data is corrupted", () => {
      localStorage.setItem("splitmate:sessions", "{broken");

      const sessions = getSessions();
      expect(sessions).toEqual([]);
      expect(localStorage.getItem("splitmate:sessions")).toBeNull();
    });

    it("should handle invalid JSON gracefully", () => {
      localStorage.setItem("splitmate:sessions", "not json at all");

      const sessions = getSessions();
      expect(sessions).toEqual([]);
      expect(localStorage.getItem("splitmate:sessions")).toBeNull();
    });

    it("should clear key without throwing on malformed array", () => {
      localStorage.setItem("splitmate:sessions", '[{"incomplete":true}]');

      const sessions = getSessions();
      expect(sessions).toEqual([]);
      expect(localStorage.getItem("splitmate:sessions")).toBeNull();
    });
  });

  // AC-3: QuotaExceededError 시 크래시 없이 {ok:false,error:'저장 공간이 부족합니다'} 반환
  describe("AC-3: QuotaExceededError handling", () => {
    it("should return error object on QuotaExceededError", () => {
      const session = makeSession("test-session", 1000);

      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn((key: string) => {
        if (key === "splitmate:sessions") {
          const error = new Error("QuotaExceededError");
          error.name = "QuotaExceededError";
          throw error;
        }
        originalSetItem.call(localStorage, key, "");
      });

      const result = saveSession(session);
      expect(result).toEqual({
        ok: false,
        error: "저장 공간이 부족합니다",
      });

      localStorage.setItem = originalSetItem;
    });

    it("should not crash and allow subsequent operations after QuotaExceeded", () => {
      const session = makeSession("test-session", 1000);

      const originalSetItem = localStorage.setItem;
      let callCount = 0;
      localStorage.setItem = vi.fn((key: string) => {
        if (key === "splitmate:sessions" && callCount < 1) {
          callCount++;
          const error = new Error("QuotaExceededError");
          error.name = "QuotaExceededError";
          throw error;
        }
        originalSetItem.call(localStorage, key, "");
      });

      const result1 = saveSession(session);
      expect(result1).toEqual({
        ok: false,
        error: "저장 공간이 부족합니다",
      });

      // Restore original setItem for next operation
      localStorage.setItem = originalSetItem;

      // Should still work
      const session2 = makeSession("session-2", 2000);
      const result2 = saveSession(session2);
      expect(result2).toEqual({ ok: true });
      expect(getSessions()).toContainEqual(
        expect.objectContaining({ id: "session-2" })
      );
    });
  });

  // AC-4: 없는 id로 getSession 시 null 반환
  describe("AC-4: getSession with non-existent id", () => {
    it("should return null for non-existent session id", () => {
      const result = getSession("nonexistent-id");
      expect(result).toBeNull();
    });

    it("should return null even after other sessions are saved", () => {
      const session: Session = {
        id: "existing",
        createdAt: Date.now(),
        splitAmount: 50000,
        paymentMethod: "CARD",
      };
      saveSession(session);

      const result = getSession("different-id");
      expect(result).toBeNull();
    });

    it("should return specific session when it exists", () => {
      const targetSession: Session = {
        id: "target",
        createdAt: 1234,
        splitAmount: 50000,
        paymentMethod: "CARD",
      };
      saveSession(targetSession);

      const result = getSession("target");
      expect(result).not.toBeNull();
      expect(result?.id).toBe("target");
      expect(result?.splitAmount).toBe(50000);
      expect(result?.createdAt).toBe(1234);
    });
  });

  // AC-5: 저장/조회/삭제 전 과정에서 console.error 출력 0개
  describe("AC-5: No console.error logged", () => {
    it("should not log console.error during normal save/get operations", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();

      const session = makeSession("test-session", 1000);
      saveSession(session);
      getSessions();
      getSession("test-session");

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should not log console.error even on corrupted data recovery", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();

      localStorage.setItem("splitmate:sessions", "{corrupted");
      getSessions();

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should not log console.error on QuotaExceededError", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();

      const session = makeSession("test-session", 1000);

      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn((key: string) => {
        if (key === "splitmate:sessions") {
          const error = new Error("QuotaExceededError");
          error.name = "QuotaExceededError";
          throw error;
        }
        originalSetItem.call(localStorage, key, "");
      });

      saveSession(session);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      localStorage.setItem = originalSetItem;
      consoleErrorSpy.mockRestore();
    });
  });

  // Bonus: 여러 Session 상호작용 시나리오
  describe("Integration: Multi-session workflows", () => {
    it("should handle save/get/clear sequence correctly", () => {
      const s1 = makeSession("s1", 1000);
      const s2 = makeSession("s2", 2000);
      const s3 = makeSession("s3", 3000);

      [s1, s2, s3].forEach((s) => saveSession(s));

      expect(getSessions()).toHaveLength(3);
      const s2Loaded = getSession("s2");
      expect(s2Loaded).toMatchObject({ id: "s2", title: "Split s2" });

      // Adding 4th should remove oldest
      const s4 = makeSession("s4", 4000);
      saveSession(s4);

      expect(getSessions()).toHaveLength(3);
      expect(getSession("s1")).toBeNull();
      const s4Loaded = getSession("s4");
      expect(s4Loaded).toMatchObject({ id: "s4", title: "Split s4" });
    });
  });
});
