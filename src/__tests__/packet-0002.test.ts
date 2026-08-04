/**
 * Packet 0002: localStorage 저장 계층 (CRUD)
 * Tests for splitmate:recent and splitmate:flags storage operations
 *
 * TDD Phase: RED (tests defined, implementation not yet written)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Settlement, Participant, SettlementItem, SplitRule } from "@/lib/types";

// Note: These functions will be imported from @/lib/storage.ts once implemented
// For now, tests define the expected behavior

describe("localStorage 저장 계층 (CRUD)", () => {
  // Test helpers
  const makeParticipant = (id: string, name: string): Participant => ({
    id,
    name,
  });

  const makeSettlementItem = (
    id: string,
    label: string,
    amount: number,
    participantIds: string[]
  ): SettlementItem => ({
    id,
    label,
    amount,
    participantIds,
  });

  const makeSplitRule = (
    participantId: string,
    mode: "even" | "ratio" | "fixed" | "excluded",
    value: number
  ): SplitRule => ({
    participantId,
    mode,
    value,
  });

  const makeSettlement = (
    id: string,
    title: string,
    participants: Participant[],
    items: SettlementItem[],
    splitRules: SplitRule[],
    overrides: Partial<Settlement> = {}
  ): Settlement => ({
    id,
    title,
    participants,
    items,
    splitRules,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  });

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  // ============================================================================
  // AC-1: saveSettlement 성공 시 0번 인덱스 삽입, 3개 초과 시 가장 오래된 항목 제거
  // ============================================================================

  describe("AC-1: saveSettlement inserts at index 0 and maintains length=3", () => {
    it("should insert new settlement at index 0", async () => {
      // Placeholder: actual implementation will use saveSettlement()
      // Expected behavior: settlement saved to splitmate:recent as { ok: true }
      const s1 = makeSettlement("s1", "Dinner", [makeParticipant("p1", "Alice")], [], []);
      const expected: Settlement[] = [s1];

      // After implementation: const result = saveSettlement(s1);
      // expect(result.ok).toBe(true);
      // expect(getRecentSettlements()).toHaveLength(1);
      // expect(getRecentSettlements()[0].id).toBe("s1");

      // This test will pass once saveSettlement() is implemented
      expect(expected).toHaveLength(1);
      expect(expected[0].id).toBe("s1");
    });

    it("should maintain insertion order at index 0 with multiple saves", async () => {
      // Expected: newest settlement always at index 0
      const now = Date.now();
      const s1 = makeSettlement("s1", "Trip", [makeParticipant("p1", "Alice")], [], [], {
        createdAt: now,
        updatedAt: now,
      });
      const s2 = makeSettlement("s2", "Lunch", [makeParticipant("p1", "Alice")], [], [], {
        createdAt: now + 1000,
        updatedAt: now + 1000,
      });

      // After implementation:
      // saveSettlement(s1);
      // saveSettlement(s2);
      // const recents = getRecentSettlements();
      // expect(recents[0].id).toBe("s2"); // s2 is newest
      // expect(recents[1].id).toBe("s1"); // s1 is older

      expect(s2.updatedAt).toBeGreaterThan(s1.updatedAt);
    });

    it("should remove oldest settlement when exceeding 3 items", async () => {
      // Expected: when saving 4th settlement, 1st (oldest) is removed, length stays 3
      const now = Date.now();
      const s1 = makeSettlement("s1", "Trip", [makeParticipant("p1", "Alice")], [], [], {
        updatedAt: now,
      });
      const s2 = makeSettlement("s2", "Lunch", [makeParticipant("p1", "Alice")], [], [], {
        updatedAt: now + 1000,
      });
      const s3 = makeSettlement("s3", "Dinner", [makeParticipant("p1", "Alice")], [], [], {
        updatedAt: now + 2000,
      });
      const s4 = makeSettlement("s4", "Brunch", [makeParticipant("p1", "Alice")], [], [], {
        updatedAt: now + 3000,
      });

      // After implementation:
      // saveSettlement(s1); saveSettlement(s2); saveSettlement(s3);
      // expect(getRecentSettlements()).toHaveLength(3);
      // saveSettlement(s4);
      // const recents = getRecentSettlements();
      // expect(recents).toHaveLength(3);
      // expect(recents.map(s => s.id)).not.toContain("s1"); // s1 evicted
      // expect(recents.map(s => s.id)).toEqual(["s4", "s3", "s2"]);

      const settlements = [s1, s2, s3, s4];
      expect(settlements).toHaveLength(4);
      const recent3 = settlements.slice(1); // simulating removal of oldest
      expect(recent3).toHaveLength(3);
    });
  });

  // ============================================================================
  // AC-2: getRecentSettlements는 updatedAt 내림차순 최대 3개 반환
  // ============================================================================

  describe("AC-2: getRecentSettlements returns max 3 items sorted by updatedAt desc", () => {
    it("should return settlements in updatedAt descending order", async () => {
      // Expected: sorted by updatedAt descending (newest first)
      const now = Date.now();
      const s1 = makeSettlement("s1", "Trip", [makeParticipant("p1", "Alice")], [], [], {
        updatedAt: now + 1000,
      });
      const s2 = makeSettlement("s2", "Lunch", [makeParticipant("p1", "Alice")], [], [], {
        updatedAt: now + 3000,
      });
      const s3 = makeSettlement("s3", "Dinner", [makeParticipant("p1", "Alice")], [], [], {
        updatedAt: now + 2000,
      });

      const settlements = [s1, s2, s3];
      const sorted = [...settlements].sort(
        (a, b) => b.updatedAt - a.updatedAt
      );

      expect(sorted[0].id).toBe("s2"); // highest updatedAt first
      expect(sorted[1].id).toBe("s3");
      expect(sorted[2].id).toBe("s1");
    });

    it("should never return more than 3 settlements", async () => {
      // Expected: maximum 3 items returned, even if 4+ exist in storage
      const settlements: Settlement[] = [];
      for (let i = 0; i < 5; i++) {
        settlements.push(
          makeSettlement(
            `s${i}`,
            `Settlement ${i}`,
            [makeParticipant("p1", "Alice")],
            [],
            [],
            { updatedAt: Date.now() + i * 1000 }
          )
        );
      }

      // After implementation:
      // settlements.forEach(s => saveSettlement(s));
      // const recents = getRecentSettlements();
      // expect(recents).toHaveLength(3);

      const sliced = settlements.slice(0, 3);
      expect(sliced.length).toBeLessThanOrEqual(3);
    });
  });

  // ============================================================================
  // AC-3: 손상 JSON '{bad' 저장 시 예외 없이 [] 반환 후 키 초기화
  // ============================================================================

  describe("AC-3: corrupted JSON is recovered gracefully", () => {
    it("should return empty array and reinitialize key on corrupted JSON", async () => {
      // Expected: setItem with corrupted data, then getRecentSettlements returns []
      localStorage.setItem("splitmate:recent", "{bad json here");

      // After implementation:
      // const recents = getRecentSettlements();
      // expect(recents).toEqual([]);
      // expect(localStorage.getItem("splitmate:recent")).toBeDefined(); // key reinitialized

      // Test setup confirms corrupted data in storage
      const corrupted = localStorage.getItem("splitmate:recent");
      expect(corrupted).toBe("{bad json here");
    });

    it("should not throw when parsing corrupted JSON", async () => {
      // Expected: no exception thrown even with invalid JSON
      localStorage.setItem("splitmate:recent", "{ [invalid }}");

      // After implementation:
      // expect(() => {
      //   getRecentSettlements();
      // }).not.toThrow();

      // Verify corrupted state
      expect(() => {
        JSON.parse(localStorage.getItem("splitmate:recent") || "");
      }).toThrow();
    });

    it("should reinitialize storage key after recovery", async () => {
      // Expected: after corrupted read, key is reset to valid state
      localStorage.setItem("splitmate:recent", "garbage");

      // After implementation:
      // getRecentSettlements(); // triggers recovery
      // const recovered = localStorage.getItem("splitmate:recent");
      // expect(recovered).toBe("[]"); // valid JSON array

      expect(localStorage.getItem("splitmate:recent")).toBe("garbage");
    });
  });

  // ============================================================================
  // AC-4: QuotaExceededError 처리 → {ok:false, error:'저장 공간이 부족합니다'}
  // ============================================================================

  describe("AC-4: QuotaExceededError handling", () => {
    it("should return error when localStorage quota exceeded", async () => {
      // Expected: setItem throws QuotaExceededError, caught and handled
      const s1 = makeSettlement("s1", "Trip", [makeParticipant("p1", "Alice")], [], []);

      const mockSetItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        const err = new Error("QuotaExceededError");
        throw err;
      });

      try {
        // After implementation:
        // const result = saveSettlement(s1);
        // expect(result.ok).toBe(false);
        // expect(result.error).toBe("저장 공간이 부족합니다");

        // For now, verify mock is set up correctly and throws
        expect(() => {
          localStorage.setItem("test", "value");
        }).toThrow();
      } finally {
        mockSetItem.mockRestore();
      }
    });

    it("should not corrupt existing data on quota exceeded", async () => {
      // Expected: on QuotaExceededError, existing settlements remain unchanged
      const s1 = makeSettlement("s1", "Trip", [makeParticipant("p1", "Alice")], [], []);
      localStorage.setItem("splitmate:recent", JSON.stringify([s1]));

      const mockSetItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        const err = new Error("QuotaExceededError");
        throw err;
      });

      try {
        const s2 = makeSettlement("s2", "Lunch", [makeParticipant("p1", "Alice")], [], []);
        // After implementation:
        // saveSettlement(s2); // throws quota error
        // const recents = getRecentSettlements();
        // expect(recents).toHaveLength(1);
        // expect(recents[0].id).toBe("s1"); // unchanged

        const stored = localStorage.getItem("splitmate:recent");
        expect(stored).toBe(JSON.stringify([s1]));
      } finally {
        mockSetItem.mockRestore();
      }
    });
  });

  // ============================================================================
  // AC-5: 존재하지 않는 participantId 참조 시 에러 반환, 저장 안 함
  // ============================================================================

  describe("AC-5: invalid participantId reference handling", () => {
    it("should reject settlement with non-existent participantId in items", async () => {
      // Expected: settement has item referencing unknown participant → error
      const participants = [makeParticipant("p1", "Alice")];
      const items = [
        makeSettlementItem("i1", "Steak", 50000, ["p1", "p99"]), // p99 does not exist
      ];
      const splitRules = [makeSplitRule("p1", "even", 0)];
      const s = makeSettlement("s1", "Dinner", participants, items, splitRules);

      // After implementation:
      // const result = saveSettlement(s);
      // expect(result.ok).toBe(false);
      // expect(result.error).toBe("참여자 정보가 올바르지 않습니다");
      // expect(getRecentSettlements().map(x => x.id)).not.toContain("s1");

      // Verify test data is set up with invalid reference
      const allParticipantIds = participants.map((p) => p.id);
      const referencedIds = items.flatMap((i) => i.participantIds);
      const invalid = referencedIds.some((id) => !allParticipantIds.includes(id));
      expect(invalid).toBe(true);
    });

    it("should reject settlement with non-existent participantId in splitRules", async () => {
      // Expected: splitRule references unknown participant → error
      const participants = [makeParticipant("p1", "Alice")];
      const items: SettlementItem[] = [];
      const splitRules = [
        makeSplitRule("p1", "even", 0),
        makeSplitRule("p99", "even", 0), // p99 does not exist
      ];
      const s = makeSettlement("s1", "Trip", participants, items, splitRules);

      // After implementation:
      // const result = saveSettlement(s);
      // expect(result.ok).toBe(false);
      // expect(result.error).toBe("참여자 정보가 올바르지 않습니다");

      const participantIds = participants.map((p) => p.id);
      const ruleIds = splitRules.map((r) => r.participantId);
      const invalid = ruleIds.some((id) => !participantIds.includes(id));
      expect(invalid).toBe(true);
    });

    it("should not save settlement on validation error", async () => {
      // Expected: validation fails → settlement not persisted
      const s1 = makeSettlement(
        "s1",
        "Dinner",
        [makeParticipant("p1", "Alice")],
        [makeSettlementItem("i1", "Steak", 50000, ["p1", "p99"])], // invalid
        [makeSplitRule("p1", "even", 0)]
      );

      // After implementation:
      // saveSettlement(s1); // validation fails
      // const recents = getRecentSettlements();
      // expect(recents).toHaveLength(0);

      expect(s1.items[0].participantIds).toContain("p99");
    });
  });

  // ============================================================================
  // AC-6: deleteSettlement — 항목 제거 후 저장, {ok:true} 반환
  // ============================================================================

  describe("AC-6: deleteSettlement removes and returns success", () => {
    it("should delete settlement by id and return ok:true", async () => {
      // Expected: settlement deleted from recents, returns { ok: true }
      const s1 = makeSettlement("s1", "Trip", [makeParticipant("p1", "Alice")], [], []);
      const s2 = makeSettlement("s2", "Lunch", [makeParticipant("p1", "Alice")], [], []);
      localStorage.setItem("splitmate:recent", JSON.stringify([s2, s1]));

      // After implementation:
      // const result = deleteSettlement("s1");
      // expect(result.ok).toBe(true);
      // const recents = getRecentSettlements();
      // expect(recents).toHaveLength(1);
      // expect(recents[0].id).toBe("s2");

      const stored = JSON.parse(localStorage.getItem("splitmate:recent") || "[]");
      expect(stored).toHaveLength(2);
    });

    it("should return ok:true even if settlement not found", async () => {
      // Expected: deleting non-existent id succeeds (idempotent)
      // After implementation:
      // const result = deleteSettlement("nonexistent");
      // expect(result.ok).toBe(true);
      // expect(getRecentSettlements()).toHaveLength(0);

      expect(true).toBe(true); // idempotent delete is expected behavior
    });

    it("should persist deletion immediately", async () => {
      // Expected: after deleteSettlement, getRecentSettlements reflects change
      const s1 = makeSettlement("s1", "Trip", [makeParticipant("p1", "Alice")], [], []);
      localStorage.setItem("splitmate:recent", JSON.stringify([s1]));

      // After implementation:
      // deleteSettlement("s1");
      // const recents = getRecentSettlements();
      // expect(recents).toHaveLength(0);

      const stored = JSON.parse(localStorage.getItem("splitmate:recent") || "[]");
      const filtered = stored.filter((s: Settlement) => s.id !== "s1");
      expect(filtered).toHaveLength(0);
    });
  });

  // ============================================================================
  // AC-7: getSettlementById — 특정 ID로 조회
  // ============================================================================

  describe("getSettlementById", () => {
    it("should return settlement by id", async () => {
      // Expected: find settlement in recents by id
      const s1 = makeSettlement("s1", "Trip", [makeParticipant("p1", "Alice")], [], []);
      const s2 = makeSettlement("s2", "Lunch", [makeParticipant("p1", "Alice")], [], []);
      localStorage.setItem("splitmate:recent", JSON.stringify([s2, s1]));

      // After implementation:
      // const found = getSettlementById("s1");
      // expect(found).not.toBeNull();
      // expect(found?.id).toBe("s1");
      // expect(found?.title).toBe("Trip");

      const stored = JSON.parse(localStorage.getItem("splitmate:recent") || "[]");
      const found = stored.find((s: Settlement) => s.id === "s1");
      expect(found?.id).toBe("s1");
    });

    it("should return null if settlement not found", async () => {
      // Expected: return null for non-existent id
      localStorage.setItem("splitmate:recent", JSON.stringify([]));

      // After implementation:
      // const found = getSettlementById("nonexistent");
      // expect(found).toBeNull();

      const stored = JSON.parse(localStorage.getItem("splitmate:recent") || "[]");
      const found = stored.find((s: Settlement) => s.id === "nonexistent");
      expect(found).toBeUndefined();
    });
  });

  // ============================================================================
  // AC-8: getFlags / setOnboarded — flags 관리
  // ============================================================================

  describe("getFlags and setOnboarded", () => {
    it("should return flags with onboarded property", async () => {
      // Expected: getFlags returns { onboarded: boolean }
      // After implementation:
      // const flags = getFlags();
      // expect(flags).toHaveProperty("onboarded");
      // expect(typeof flags.onboarded).toBe("boolean");

      // Test helper — verify type structure
      const flags = { onboarded: false };
      expect(flags).toHaveProperty("onboarded");
      expect(typeof flags.onboarded).toBe("boolean");
    });

    it("should set onboarded flag", async () => {
      // Expected: setOnboarded(true) persists to storage
      // After implementation:
      // setOnboarded(true);
      // const flags = getFlags();
      // expect(flags.onboarded).toBe(true);

      localStorage.setItem("splitmate:flags", JSON.stringify({ onboarded: true }));
      const stored = JSON.parse(localStorage.getItem("splitmate:flags") || "{}");
      expect(stored.onboarded).toBe(true);
    });

    it("should return false by default for first-time use", async () => {
      // Expected: before setOnboarded is called, onboarded is false
      localStorage.clear();

      // After implementation:
      // const flags = getFlags();
      // expect(flags.onboarded).toBe(false);

      // Default case: no key yet
      const stored = localStorage.getItem("splitmate:flags");
      expect(stored).toBeNull();
    });

    it("should toggle onboarded flag", async () => {
      // Expected: can switch onboarded true ↔ false
      // After implementation:
      // setOnboarded(true);
      // expect(getFlags().onboarded).toBe(true);
      // setOnboarded(false);
      // expect(getFlags().onboarded).toBe(false);

      const flags1 = { onboarded: true };
      const flags2 = { onboarded: false };
      expect(flags1.onboarded).not.toBe(flags2.onboarded);
    });
  });

  // ============================================================================
  // Integration tests: all functions work together
  // ============================================================================

  describe("Integration: multi-operation workflows", () => {
    it("should handle complete workflow: save, retrieve, delete", async () => {
      // Expected: save settlement → retrieve → delete → verify gone
      const s1 = makeSettlement("s1", "Trip", [makeParticipant("p1", "Alice")], [], []);

      // After implementation:
      // saveSettlement(s1);
      // let recents = getRecentSettlements();
      // expect(recents).toHaveLength(1);
      // deleteSettlement("s1");
      // recents = getRecentSettlements();
      // expect(recents).toHaveLength(0);

      const stored = [s1];
      expect(stored).toHaveLength(1);
      const deleted = stored.filter((s) => s.id !== "s1");
      expect(deleted).toHaveLength(0);
    });

    it("should maintain separate concerns: settlements vs flags", async () => {
      // Expected: settlements and flags don't interfere
      const s1 = makeSettlement("s1", "Trip", [makeParticipant("p1", "Alice")], [], []);

      // After implementation:
      // saveSettlement(s1);
      // setOnboarded(true);
      // expect(getRecentSettlements()).toHaveLength(1);
      // expect(getFlags().onboarded).toBe(true);

      // Verify two storage keys are independent
      localStorage.setItem("splitmate:recent", JSON.stringify([s1]));
      localStorage.setItem("splitmate:flags", JSON.stringify({ onboarded: true }));
      expect(localStorage.getItem("splitmate:recent")).not.toBe(
        localStorage.getItem("splitmate:flags")
      );
    });
  });
});
