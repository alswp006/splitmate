import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Result from "@/pages/Result";
import { getHistoryList, runNightlyBatch } from "@/lib/history";
import type { HistoryEntry } from "@/lib/history";

// --- react-router-dom: keep real Navigate/Routes/Route, mock only useNavigate ---
const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => mockNavigate,
}));

// --- @/state/AppStateContext ---
const { mockSetInput } = vi.hoisted(() => ({ mockSetInput: vi.fn() }));
vi.mock("@/state/AppStateContext", () => ({
  useAppState: () => ({ setInput: mockSetInput, input: null, result: null }),
  AppStateProvider: (props: any) => props.children,
}));

// --- @toss/tds-mobile: crashes in jsdom, mock every export as a passthrough,
// but keep Toast.show as an inspectable spy ---
const { mockToastShow } = vi.hoisted(() => ({ mockToastShow: vi.fn() }));
vi.mock("@toss/tds-mobile", () => {
  const passthrough = (props: any) =>
    React.createElement(React.Fragment, null, props?.children ?? null);
  const known: Record<string, unknown> = { Toast: { show: mockToastShow } };
  return new Proxy(known, {
    get(target: Record<string, unknown>, prop: string) {
      if (prop === "__esModule") return true;
      if (prop === "then") return undefined;
      if (prop in target) return target[prop];
      return passthrough;
    },
  });
});

// --- @/components/AdSlot: keep it a harmless no-op in these tests ---
vi.mock("@/components/AdSlot", () => {
  const AdSlot = () => null;
  return { default: AdSlot, AdSlot };
});

function renderResultAt(state: unknown) {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [{ pathname: "/result", state }] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, { path: "/result", element: React.createElement(Result) }),
        React.createElement(Route, {
          path: "/",
          element: React.createElement("div", { "data-testid": "home-page" }, "홈"),
        })
      )
    )
  );
}

describe("배열 렌더 지점 옵셔널 체이닝·기본값 방어", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- AC-1: undefined/누락 입력에서 .map() 호출이 예외를 던지지 않는다 ----

  it("AC-1[P0]: should not throw and render zero items when result exists but perPerson is undefined", () => {
    expect(() =>
      renderResultAt({ result: { totalAmount: 320000 } })
    ).not.toThrow();
    expect(screen.queryByTestId("home-page")).toBeNull();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("AC-1[P0]: should not throw and render zero items when result exists but perPerson is explicitly null", () => {
    expect(() =>
      renderResultAt({ result: { totalAmount: 320000, perPerson: null } })
    ).not.toThrow();
    expect(screen.queryByTestId("home-page")).toBeNull();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("AC-1: should render one list item per person when perPerson has valid entries", () => {
    renderResultAt({
      result: {
        totalAmount: 320000,
        perPerson: [
          { name: "민제", amount: 160000 },
          { name: "지수", amount: 160000 },
        ],
      },
    });
    expect(screen.queryAllByRole("listitem")).toHaveLength(2);
  });

  // ---- AC-2: 파생 배열 함수가 입력 부재 시 빈 배열을 반환한다 ----

  it("AC-2: getHistoryList should return an empty array when input is undefined or null", () => {
    expect(getHistoryList(undefined)).toEqual([]);
    expect(getHistoryList(null)).toEqual([]);
  });

  it("AC-2: getHistoryList should default a missing perPerson field on each entry to an empty array", () => {
    const raw = [
      { id: "h1", totalAmount: 10000, createdAt: "2026-08-01" },
    ] as unknown as HistoryEntry[];
    const result = getHistoryList(raw);
    expect(result).toHaveLength(1);
    expect(result[0].perPerson).toEqual([]);
  });

  // ---- AC-3: 야간배치 파이프라인이 상태 누락 케이스에서 크래시 없이 완료된다 ----

  it("AC-3[P0]: runNightlyBatch should complete without crashing and return zeroed totals when entries are missing", () => {
    expect(() => runNightlyBatch(undefined)).not.toThrow();
    expect(runNightlyBatch(undefined)).toEqual({ processedCount: 0, totalAmount: 0 });
    expect(runNightlyBatch(null)).toEqual({ processedCount: 0, totalAmount: 0 });
  });

  it("AC-3[P0]: runNightlyBatch should aggregate processedCount and totalAmount for valid entries", () => {
    const entries: HistoryEntry[] = [
      { id: "h1", totalAmount: 10000, perPerson: [], createdAt: "2026-08-01" },
      { id: "h2", totalAmount: 5000, perPerson: [], createdAt: "2026-08-02" },
    ];
    const result = runNightlyBatch(entries);
    expect(result.processedCount).toBe(2);
    expect(result.totalAmount).toBe(15000);
  });
});
