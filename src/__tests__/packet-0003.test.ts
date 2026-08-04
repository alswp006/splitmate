import { describe, it, expect } from "vitest";
import { calculateSplit, type Share } from "@/lib/calc";

describe("calculateSplit - 분할 계산 순수 함수", () => {
  // AC-1: sum(shares.amount) === total 항상 성립(잔차 첫 참여자 가산)
  it("AC-1[P0]: sum of amounts always equals total (remainder to first participant)", () => {
    const result = calculateSplit({
      total: 30000,
      participants: [
        { id: "p1", name: "Alice", mode: "even" },
        { id: "p2", name: "Bob", mode: "even" },
        { id: "p3", name: "Charlie", mode: "even" },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const sum = result.result.shares.reduce((acc: number, s: Share) => acc + s.amount, 0);
      expect(sum).toBe(30000);
    }
  });

  // AC-1: Test with uneven split to verify remainder handling
  it("AC-1: remainder distributed to first participant in uneven split", () => {
    const result = calculateSplit({
      total: 10000,
      participants: [
        { id: "p1", name: "Alice", mode: "even" },
        { id: "p2", name: "Bob", mode: "even" },
        { id: "p3", name: "Charlie", mode: "even" },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const sum = result.result.shares.reduce((acc: number, s: Share) => acc + s.amount, 0);
      expect(sum).toBe(10000);
      // 10000 / 3 = 3333.33... → 3333 * 3 = 9999, remainder 1
      // First participant gets 3333 + 1 = 3334
      const first = result.result.shares[0];
      expect(first.amount).toBe(3334);
      const others = result.result.shares.slice(1);
      others.forEach((share: Share) => {
        expect(share.amount).toBe(3333);
      });
    }
  });

  // AC-2: 3명·30,000원 전원 even → 각 10,000원
  it("AC-2[P0]: 3 people, 30000 KRW even split → each 10000", () => {
    const result = calculateSplit({
      total: 30000,
      participants: [
        { id: "p1", name: "Alice", mode: "even" },
        { id: "p2", name: "Bob", mode: "even" },
        { id: "p3", name: "Charlie", mode: "even" },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.shares).toHaveLength(3);
      result.result.shares.forEach((share: Share) => {
        expect(share.amount).toBe(10000);
      });
    }
  });

  // AC-3: 30,000원, 지민 fixed=12,000, 나머지 even → 지민 12,000/나머지 각 9,000
  it("AC-3[P0]: 30000 KRW, one fixed 12000, rest even → fixed 12000, others 9000", () => {
    const result = calculateSplit({
      total: 30000,
      participants: [
        { id: "jimin", name: "지민", mode: "fixed", amount: 12000 },
        { id: "p2", name: "Bob", mode: "even" },
        { id: "p3", name: "Charlie", mode: "even" },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const jiminShare = result.result.shares.find(
        (s: Share) => s.participantId === "jimin"
      );
      const others = result.result.shares.filter(
        (s: Share) => s.participantId !== "jimin"
      );

      expect(jiminShare?.amount).toBe(12000);
      expect(others).toHaveLength(2);
      others.forEach((share: Share) => {
        expect(share.amount).toBe(9000);
      });
    }
  });

  // AC-4: 3명·30,000원 현우 excluded → 현우 0, 나머지 각 15,000
  it("AC-4[P0]: 3 people, 30000 KRW, one excluded → excluded 0, others 15000 each", () => {
    const result = calculateSplit({
      total: 30000,
      participants: [
        { id: "hyunwoo", name: "현우", mode: "excluded" },
        { id: "p2", name: "Bob", mode: "even" },
        { id: "p3", name: "Charlie", mode: "even" },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const hyunwooShare = result.result.shares.find(
        (s: Share) => s.participantId === "hyunwoo"
      );
      const others = result.result.shares.filter(
        (s: Share) => s.participantId !== "hyunwoo"
      );

      expect(hyunwooShare?.amount).toBe(0);
      expect(others).toHaveLength(2);
      others.forEach((share: Share) => {
        expect(share.amount).toBe(15000);
      });
    }
  });

  // AC-5: 고정금액 합 40,000 > 총액 30,000 → {ok:false,error:'고정 금액 합이 총액을 초과했어요'}
  it("AC-5[P0]: fixed sum > total → returns error", () => {
    const result = calculateSplit({
      total: 30000,
      participants: [
        { id: "p1", name: "Alice", mode: "fixed", amount: 40000 },
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("고정 금액 합이 총액을 초과했어요");
    }
  });

  // AC-6: 전원 excluded → {ok:false,error:'최소 1명은 정산에 포함되어야 해요'}
  it("AC-6[P0]: all excluded → returns error", () => {
    const result = calculateSplit({
      total: 30000,
      participants: [
        { id: "p1", name: "Alice", mode: "excluded" },
        { id: "p2", name: "Bob", mode: "excluded" },
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("최소 1명은 정산에 포함되어야 해요");
    }
  });
});
