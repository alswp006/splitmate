import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { render, screen, renderHook, act } from "@testing-library/react";
import { mockTds } from "@/__tests__/__helpers__/mocks";
import type { SettlementResult } from "@/lib/types";

// TDS는 jsdom에서 충돌 → mock 필수
mockTds();

// @apps-in-toss/web-framework — generateHapticFeedback을 spy 가능한 형태로 mock
vi.mock("@apps-in-toss/web-framework", () => ({
  generateHapticFeedback: vi.fn(),
}));

import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { useHaptic } from "@/hooks/useHaptic";
import { ShareCard } from "@/components/ShareCard";

const mockResult: SettlementResult = {
  total: 42000,
  shares: [
    { participantId: "p1", name: "지민", amount: 21000 },
    { participantId: "p2", name: "서연", amount: 21000 },
  ],
};

describe("Packet 0011: 햅틱·공유 헬퍼 컴포넌트 + 최종 UX 폴리시", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // AC-1: useHaptic 훅이 success/tickWeak/tickStrong 타입을 안전히 호출
  // (미지원 환경에서는 예외를 삼킨다)
  // ============================================================================

  describe("AC-1[P0]: useHaptic — success/tickWeak/tickStrong 호출", () => {
    it("success()를 호출하면 generateHapticFeedback({ type: 'success' })가 호출된다", () => {
      const { result } = renderHook(() => useHaptic());

      act(() => {
        result.current.success();
      });

      expect(generateHapticFeedback).toHaveBeenCalledTimes(1);
      expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "success" });
    });

    it("tickWeak()/tickStrong()를 호출하면 각각 올바른 type으로 SDK가 호출된다", () => {
      const { result } = renderHook(() => useHaptic());

      act(() => {
        result.current.tickWeak();
      });
      expect(generateHapticFeedback).toHaveBeenLastCalledWith({ type: "tickWeak" });

      act(() => {
        result.current.tickStrong();
      });
      expect(generateHapticFeedback).toHaveBeenLastCalledWith({ type: "tickStrong" });
      expect(generateHapticFeedback).toHaveBeenCalledTimes(2);
    });

    it("[P0-error] SDK가 동기 throw해도(WebView 밖) 예외를 삼키고 크래시하지 않는다", () => {
      vi.mocked(generateHapticFeedback).mockImplementation(() => {
        throw new Error("not supported outside WebView");
      });

      const { result } = renderHook(() => useHaptic());

      expect(() => {
        act(() => {
          result.current.success();
        });
      }).not.toThrow();
      expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "success" });
    });

    it("SDK가 reject된 Promise를 반환해도 unhandled rejection 없이 삼킨다", async () => {
      vi.mocked(generateHapticFeedback).mockImplementation(() =>
        Promise.reject(new Error("unsupported")),
      );

      const { result } = renderHook(() => useHaptic());

      expect(() => {
        act(() => {
          result.current.tickWeak();
        });
      }).not.toThrow();

      // microtask flush — reject가 처리되었는지(unhandled로 남지 않는지) 확인
      await act(async () => {
        await Promise.resolve();
      });
      expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });
    });
  });

  // ============================================================================
  // AC-2: 공유 카드 컴포넌트가 TDS만으로 결과를 요약 렌더
  // ============================================================================

  describe("AC-2[P0]: ShareCard — 정산 결과 요약 렌더", () => {
    it("총액과 각 참여자의 이름·금액을 렌더한다", () => {
      render(
        React.createElement(ShareCard, { title: "제주 여행", result: mockResult }),
      );

      expect(screen.getByText("제주 여행")).toBeInTheDocument();
      expect(screen.getByText(/42,000/)).toBeInTheDocument();
      expect(screen.getByText("지민")).toBeInTheDocument();
      expect(screen.getByText("서연")).toBeInTheDocument();
      expect(screen.getAllByText(/21,000/).length).toBe(2);
    });

    it("[edge] 참여자가 없는 결과(shares: [])도 크래시 없이 총액만 렌더한다", () => {
      const empty: SettlementResult = { total: 0, shares: [] };

      expect(() =>
        render(React.createElement(ShareCard, { title: "빈 정산", result: empty })),
      ).not.toThrow();

      expect(screen.getByText("빈 정산")).toBeInTheDocument();
      expect(screen.getByText(/^0/)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // AC-3: App.tsx/main.tsx는 이 패킷의 files에 포함되지 않는다(진입점 배선은 0010 소유)
  // ============================================================================

  describe("AC-3: 진입점 파일 비수정 (App.tsx/main.tsx 소유권은 0010)", () => {
    it("이 패킷이 만드는 useHaptic.ts / ShareCard.tsx는 App.tsx/main.tsx를 import하지 않는다", () => {
      const root = path.resolve(__dirname, "../..");
      const hookSrc = fs.readFileSync(path.join(root, "src/hooks/useHaptic.ts"), "utf-8");
      const cardSrc = fs.readFileSync(path.join(root, "src/components/ShareCard.tsx"), "utf-8");

      expect(hookSrc).not.toMatch(/from\s+["'].*App["']/);
      expect(cardSrc).not.toMatch(/from\s+["'].*App["']/);
      expect(hookSrc).not.toMatch(/from\s+["'].*main["']/);
      expect(cardSrc).not.toMatch(/from\s+["'].*main["']/);
    });
  });

  // ============================================================================
  // AC-4: HEX 하드코딩 없음(var(--tds-color-*)만) — tsc/빌드는 pre-submission
  // checklist(별도)에서 검증
  // ============================================================================

  describe("AC-4: HEX 색상 하드코딩 없음 (다크모드 대응)", () => {
    it("ShareCard.tsx / useHaptic.ts 소스에 하드코딩된 HEX 색상이 없다", () => {
      const root = path.resolve(__dirname, "../..");
      const hookSrc = fs.readFileSync(path.join(root, "src/hooks/useHaptic.ts"), "utf-8");
      const cardSrc = fs.readFileSync(path.join(root, "src/components/ShareCard.tsx"), "utf-8");
      const hexPattern = /#[0-9a-fA-F]{3,8}\b/;

      expect(hexPattern.test(hookSrc)).toBe(false);
      expect(hexPattern.test(cardSrc)).toBe(false);
    });
  });
});
