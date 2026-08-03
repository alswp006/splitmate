import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Result from "@/pages/Result";

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

// --- @/components/AdSlot: proves ads never mount before the guard ---
const { mockAdSlotRender } = vi.hoisted(() => ({ mockAdSlotRender: vi.fn() }));
vi.mock("@/components/AdSlot", () => {
  const AdSlot = (props: any) => {
    mockAdSlotRender(props);
    return null;
  };
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

describe("결과 상태 누락 가드 및 안전 배열 렌더 (heal-2-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- AC-1: state.result가 없으면 본문/광고/계산 전에 Home으로 리다이렉트 + Toast ----

  it("AC-1[P0]: should redirect to home and never mount ads/body when location.state is entirely undefined (URL 직접진입/새로고침)", () => {
    expect(() => renderResultAt(undefined)).not.toThrow();
    expect(screen.getByTestId("home-page").textContent).toBe("홈");
    expect(mockAdSlotRender).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledTimes(1);
  });

  it("AC-1[P0]: should redirect to home and never mount ads/body when state.result is undefined", () => {
    renderResultAt({ result: undefined });
    expect(screen.getByTestId("home-page").textContent).toBe("홈");
    expect(mockAdSlotRender).not.toHaveBeenCalled();
    const serializedCall = JSON.stringify(mockToastShow.mock.calls[0]);
    expect(serializedCall).toContain("계산 내역을 찾을 수 없어요. 처음부터 다시 시작해주세요");
  });

  it("AC-1: should render result content (no redirect, no toast) when state.result is a valid object", () => {
    renderResultAt({
      result: {
        totalAmount: 320000,
        perPerson: [{ name: "민제", amount: 160000 }],
      },
    });
    expect(screen.queryByTestId("home-page")).toBeNull();
    expect(mockToastShow).not.toHaveBeenCalled();
    expect(mockAdSlotRender).toHaveBeenCalledTimes(1);
  });

  // ---- AC-2: 배열 렌더는 (arr ?? []).map 형태로 undefined에서도 크래시하지 않는다 ----

  it("AC-2[P0]: should not throw and render zero list items when result.perPerson is undefined", () => {
    expect(() =>
      renderResultAt({ result: { totalAmount: 320000 } })
    ).not.toThrow();
    expect(screen.queryByTestId("home-page")).toBeNull();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("AC-2: should render exactly one list item per entry when perPerson has valid entries", () => {
    renderResultAt({
      result: {
        totalAmount: 320000,
        perPerson: [
          { name: "민제", amount: 160000 },
          { name: "지수", amount: 160000 },
        ],
      },
    });
    const items = screen.queryAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain("민제");
    expect(items[1].textContent).toContain("지수");
  });

  // ---- AC-3: 새로고침·URL 직접진입·상태누락 시나리오가 그린이다 ----

  it("AC-3[P0]: should treat a fresh URL entry with no history state exactly like a missing result (redirect, no crash)", () => {
    expect(() => renderResultAt(undefined)).not.toThrow();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByTestId("home-page").textContent).toBe("홈");
  });

  it("AC-3: should show exactly one guiding toast per missing-state render, not duplicated across body/ads paths", () => {
    renderResultAt({ result: null });
    expect(mockToastShow).toHaveBeenCalledTimes(1);
  });
});
