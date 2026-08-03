import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Result from "@/pages/Result";

// --- react-router-dom: keep real Navigate/Routes/Route, mock only useNavigate ---
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => mockNavigate,
}));

// --- @/state/AppStateContext ---
const mockSetInput = vi.fn();
vi.mock("@/state/AppStateContext", () => ({
  useAppState: () => ({ setInput: mockSetInput, input: null, result: null }),
  AppStateProvider: (props: any) => props.children,
}));

// --- @toss/tds-mobile: crashes in jsdom, mock every export as a passthrough,
// but keep Toast.show as an inspectable spy ---
const mockToastShow = vi.fn();
vi.mock("@toss/tds-mobile", () => {
  const passthrough = (props: any) =>
    React.createElement(React.Fragment, null, props?.children ?? null);
  const known: Record<string, unknown> = { Toast: { show: mockToastShow } };
  return new Proxy(known, {
    get(target: Record<string, unknown>, prop: string) {
      if (prop === "__esModule") return true;
      if (prop in target) return target[prop];
      return passthrough;
    },
  });
});

// --- @/components/AdSlot: proves the guard runs before ad/body logic ---
const mockAdSlotRender = vi.fn();
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

const VALID_RESULT_STATE = {
  result: {
    totalAmount: 320000,
    perPerson: [
      { name: "민제", amount: 160000 },
      { name: "지수", amount: 160000 },
    ],
  },
};

describe("결과 상태 누락 가드 및 안전한 리다이렉트 추가", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AC-1[P0]: should redirect to home without crashing when there is no route state (fresh URL entry/새로고침)", () => {
    expect(() => renderResultAt(undefined)).not.toThrow();
    expect(screen.getByTestId("home-page").textContent).toBe("홈");
  });

  it("AC-1[P0]: should redirect to home when route state exists but result is missing", () => {
    renderResultAt({ result: null });
    expect(screen.getByTestId("home-page").textContent).toBe("홈");
    expect(screen.queryByTestId("home-page")).not.toBeNull();
  });

  it("AC-1: should render Result content (not redirect) when a valid result exists in route state", () => {
    renderResultAt(VALID_RESULT_STATE);
    expect(screen.queryByTestId("home-page")).toBeNull();
    expect(mockAdSlotRender).toHaveBeenCalled();
  });

  it("AC-2[P0]: should show a single toast guiding the user back to start over when redirecting", () => {
    renderResultAt(undefined);
    expect(mockToastShow).toHaveBeenCalledTimes(1);
    const serializedCall = JSON.stringify(mockToastShow.mock.calls[0]);
    expect(serializedCall).toContain("계산 내역을 찾을 수 없어요");
  });

  it("AC-2: should not show the missing-result toast when a valid result is rendered", () => {
    renderResultAt(VALID_RESULT_STATE);
    expect(mockToastShow).not.toHaveBeenCalled();
  });

  it("AC-3[P0]: should not render ads or result body before the guard when result is missing", () => {
    renderResultAt({ result: undefined });
    expect(mockAdSlotRender).not.toHaveBeenCalled();
    expect(screen.getByTestId("home-page").textContent).toBe("홈");
  });
});
