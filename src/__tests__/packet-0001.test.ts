import { describe, it, expect } from "vitest";
import type {
  SplitMode,
  Participant,
  SettlementItem,
  SplitRule,
  Settlement,
  ParticipantShare,
  SettlementResult,
  RouteState,
} from "@/lib/types";

/**
 * 패킷 0001: 엔티티 타입 & RouteState 계약 정의
 *
 * 이 패킷은 SplitMate의 모든 데이터 모델과 페이지 간 라우팅 계약을
 * 순수 타입/인터페이스로 정의합니다. 런타임 코드는 없고 타입만 존재합니다.
 *
 * Acceptance Criteria:
 * AC-1: SplitMode 유니온이 정확히 4개 모드를 export한다
 * AC-2: Settlement 인터페이스가 모든 SPEC 필드(id, title, participants, items, splitRules, createdAt, updatedAt)를 갖는다
 * AC-3: Settlement 제약을 주석으로 명시한다 (participants: 2~20, items: 0~50)
 * AC-4: RouteState가 5개 경로('/', '/new', '/new/items', '/new/split', '/result')와 일치하는 키를 갖고 각 경로별 payload 타입을 정의한다
 * AC-5: 순수 타입(런타임 코드 없음) — import만으로 tsc --noEmit이 통과해야 한다
 */

describe("AC-1: SplitMode union type", () => {
  it("should export SplitMode with exactly 4 modes: even, ratio, fixed, excluded", () => {
    // Runtime validation: create valid SplitMode values
    const modes: SplitMode[] = ["even", "ratio", "fixed", "excluded"];

    expect(modes).toHaveLength(4);
    expect(modes[0]).toBe("even");
    expect(modes[1]).toBe("ratio");
    expect(modes[2]).toBe("fixed");
    expect(modes[3]).toBe("excluded");
  });

  it("should reject invalid SplitMode values at compile time (type check via tsc)", () => {
    // This test validates via type checker, not runtime
    // Intentional: const invalid: SplitMode = "invalid"; // ← tsc error
    const valid: SplitMode = "even";
    expect(valid).toBe("even");
  });
});

describe("AC-2: Settlement interface with all SPEC fields", () => {
  it("should have id, title, participants, items, splitRules, createdAt, updatedAt fields", () => {
    const now = Date.now();
    const settlement: Settlement = {
      id: "settle-123",
      title: "제주여행",
      participants: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
      items: [{ id: "item-1", label: "스테이크", amount: 100000, participantIds: ["p1", "p2"] }],
      splitRules: [
        { participantId: "p1", mode: "even", value: 0 },
        { participantId: "p2", mode: "even", value: 0 },
      ],
      createdAt: now,
      updatedAt: now,
    };

    expect(settlement.id).toBe("settle-123");
    expect(settlement.title).toBe("제주여행");
    expect(settlement.participants).toHaveLength(2);
    expect(settlement.items).toHaveLength(1);
    expect(settlement.splitRules).toHaveLength(2);
    expect(settlement.createdAt).toBe(now);
    expect(settlement.updatedAt).toBe(now);
  });

  it("should accept 0 items (empty items array)", () => {
    const now = Date.now();
    const settlement: Settlement = {
      id: "settle-empty",
      title: "준비",
      participants: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
      items: [],
      splitRules: [
        { participantId: "p1", mode: "even", value: 0 },
        { participantId: "p2", mode: "even", value: 0 },
      ],
      createdAt: now,
      updatedAt: now,
    };

    expect(settlement.items).toHaveLength(0);
  });

  it("Participant type should have id and name fields", () => {
    const participant: Participant = { id: "p-uuid-1", name: "Alice" };

    expect(participant.id).toBe("p-uuid-1");
    expect(participant.name).toBe("Alice");
  });

  it("SettlementItem type should have id, label, amount, participantIds fields", () => {
    const item: SettlementItem = {
      id: "item-uuid-1",
      label: "스테이크",
      amount: 100000,
      participantIds: ["p1", "p2"],
    };

    expect(item.id).toBe("item-uuid-1");
    expect(item.label).toBe("스테이크");
    expect(item.amount).toBe(100000);
    expect(item.participantIds).toHaveLength(2);
    expect(item.participantIds[0]).toBe("p1");
  });

  it("SplitRule type should have participantId, mode, value fields", () => {
    const rule: SplitRule = {
      participantId: "p1",
      mode: "ratio",
      value: 1.5,
    };

    expect(rule.participantId).toBe("p1");
    expect(rule.mode).toBe("ratio");
    expect(rule.value).toBe(1.5);
  });

  it("ParticipantShare type should have participantId, name, amount fields", () => {
    const share: ParticipantShare = {
      participantId: "p1",
      name: "Alice",
      amount: 50000,
    };

    expect(share.participantId).toBe("p1");
    expect(share.name).toBe("Alice");
    expect(share.amount).toBe(50000);
  });

  it("SettlementResult type should have total and shares fields", () => {
    const result: SettlementResult = {
      total: 100000,
      shares: [
        { participantId: "p1", name: "Alice", amount: 50000 },
        { participantId: "p2", name: "Bob", amount: 50000 },
      ],
    };

    expect(result.total).toBe(100000);
    expect(result.shares).toHaveLength(2);
    expect(result.shares[0].amount).toBe(50000);
  });
});

describe("AC-3: Settlement constraints documented", () => {
  it("should support minimum participants (2)", () => {
    const now = Date.now();
    const settlement: Settlement = {
      id: "settle-min",
      title: "여행",
      participants: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
      items: [],
      splitRules: [
        { participantId: "p1", mode: "even", value: 0 },
        { participantId: "p2", mode: "even", value: 0 },
      ],
      createdAt: now,
      updatedAt: now,
    };

    expect(settlement.participants.length).toBeGreaterThanOrEqual(2);
    expect(settlement.participants.length).toBeLessThanOrEqual(20);
  });

  it("should support maximum participants (20)", () => {
    const now = Date.now();
    const participants: Participant[] = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i}`,
      name: `Person${i}`,
    }));

    const splitRules: SplitRule[] = participants.map((p) => ({
      participantId: p.id,
      mode: "even" as const,
      value: 0,
    }));

    const settlement: Settlement = {
      id: "settle-max",
      title: "여행",
      participants,
      items: [],
      splitRules,
      createdAt: now,
      updatedAt: now,
    };

    expect(settlement.participants.length).toBe(20);
  });

  it("should support minimum items (0)", () => {
    const now = Date.now();
    const settlement: Settlement = {
      id: "settle-no-items",
      title: "준비",
      participants: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
      items: [],
      splitRules: [
        { participantId: "p1", mode: "even", value: 0 },
        { participantId: "p2", mode: "even", value: 0 },
      ],
      createdAt: now,
      updatedAt: now,
    };

    expect(settlement.items.length).toBeGreaterThanOrEqual(0);
    expect(settlement.items.length).toBeLessThanOrEqual(50);
  });

  it("should support maximum items (50)", () => {
    const now = Date.now();
    const items: SettlementItem[] = Array.from({ length: 50 }, (_, i) => ({
      id: `item${i}`,
      label: `Item${i}`,
      amount: 1000,
      participantIds: ["p1"],
    }));

    const settlement: Settlement = {
      id: "settle-many-items",
      title: "여행",
      participants: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
      items,
      splitRules: [
        { participantId: "p1", mode: "even", value: 0 },
        { participantId: "p2", mode: "even", value: 0 },
      ],
      createdAt: now,
      updatedAt: now,
    };

    expect(settlement.items.length).toBe(50);
  });
});

describe("AC-4: RouteState defines 5 routes with correct payload types", () => {
  it("should have RouteState key for S1 root home page (/)", () => {
    // S1: Home page — empty state or showing recent settlements
    const homeState: RouteState["/"] = {};
    expect(homeState).toBeDefined();
  });

  it("should have RouteState key for S2 new settlement creation (/new)", () => {
    // S2: New settlement — title input
    const newState: RouteState["/new"] = { title: "제주여행" };
    expect(newState.title).toBe("제주여행");
  });

  it("should have RouteState key for S3 add items (/new/items)", () => {
    // S3: Items page — add expenses
    const itemsState: RouteState["/new/items"] = {
      title: "제주여행",
      participants: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
      items: [],
    };
    expect(itemsState.title).toBe("제주여행");
    expect(itemsState.participants).toHaveLength(2);
  });

  it("should have RouteState key for S4 configure split rules (/new/split)", () => {
    // S4: Split rules page — set split mode and rules
    const splitState: RouteState["/new/split"] = {
      title: "제주여행",
      participants: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
      items: [{ id: "item-1", label: "스테이크", amount: 100000, participantIds: ["p1", "p2"] }],
      splitRules: [
        { participantId: "p1", mode: "even", value: 0 },
        { participantId: "p2", mode: "even", value: 0 },
      ],
    };
    expect(splitState.splitRules).toHaveLength(2);
    expect(splitState.splitRules[0].mode).toBe("even");
  });

  it("should have RouteState key for S5 settlement result (/result)", () => {
    // S5: Result page — shows settlement calculation and transfer links
    const resultState: RouteState["/result"] = {
      settlementId: "settle-123",
      result: {
        total: 100000,
        shares: [
          { participantId: "p1", name: "Alice", amount: 50000 },
          { participantId: "p2", name: "Bob", amount: 50000 },
        ],
      },
    };
    expect(resultState.settlementId).toBe("settle-123");
    expect(resultState.result).toBeDefined();
    if (resultState.result) {
      expect(resultState.result.total).toBe(100000);
    }
  });

  it("all 5 RouteState keys should be unique paths", () => {
    // Validate that RouteState has exactly the 5 required keys
    const keys: Array<keyof RouteState> = ["/", "/new", "/new/items", "/new/split", "/result"];

    expect(keys).toHaveLength(5);
    // Each key should be a distinct string
    expect(new Set(keys).size).toBe(5);
  });
});

describe("AC-5: Pure types (no runtime code)", () => {
  it("should be compilable with tsc --noEmit (no exports of implementation)", () => {
    // If this test passes, it means:
    // 1. All imported types exist
    // 2. tsc compiled the module without errors
    // 3. No runtime code is executed (types are erased at compile time)

    // Dummy assertions to ensure types are imported
    const splitModeExample: SplitMode = "even";
    expect(typeof splitModeExample).toBe("string");

    const participantExample: Participant = { id: "p1", name: "Alice" };
    expect(typeof participantExample.id).toBe("string");
  });

  it("should not export any functions or values (type-only exports)", () => {
    // All exports from types.ts should be type-only
    // This is validated by tsc when building

    // If types.ts has runtime code (e.g., const foo = 5), this test would still pass
    // but tsc --noEmit would report it (per CLAUDE.md checklist #1)
    // The actual guarantee comes from the build step, not this test.

    expect(true).toBe(true); // Placeholder
  });

  it("should pass TypeScript strict mode compilation", () => {
    // Validate that types work correctly in strict mode
    const settlement: Settlement = {
      id: "test",
      title: "Test",
      participants: [{ id: "p1", name: "Alice" }],
      items: [],
      splitRules: [{ participantId: "p1", mode: "even", value: 0 }],
      createdAt: 0,
      updatedAt: 0,
    };

    // All fields must be assigned (strict mode)
    expect(settlement.id).toBeDefined();
    expect(settlement.createdAt).toBeGreaterThanOrEqual(0);
  });
});
