import { describe, it, expect, vi } from "vitest";
import React from "react";
import { screen, fireEvent, within, waitFor } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { Settlement } from "@/lib/types";

mockAll();

// Home reads recent settlements from storage — mock the storage layer directly
// so each test controls exactly what getRecentSettlements()/deleteSettlement() return.
const getRecentSettlements = vi.fn<() => Settlement[]>();
const deleteSettlement = vi.fn();

vi.mock("@/lib/storage", () => ({
  getRecentSettlements: (...args: unknown[]) => getRecentSettlements(...(args as [])),
  deleteSettlement: (...args: unknown[]) => deleteSettlement(...(args as [])),
}));

import Home from "@/pages/Home";

function makeSettlement(overrides: Partial<Settlement> = {}): Settlement {
  return {
    id: "s1",
    title: "제주도 여행",
    participants: [
      { id: "p1", name: "민제" },
      { id: "p2", name: "지은" },
      { id: "p3", name: "현우" },
    ],
    items: [
      { id: "i1", label: "숙소", amount: 200000, participantIds: ["p1", "p2", "p3"] },
      { id: "i2", label: "저녁", amount: 90000, participantIds: ["p1", "p2", "p3"] },
    ],
    splitRules: [
      { participantId: "p1", mode: "even", value: 0 },
      { participantId: "p2", mode: "even", value: 0 },
      { participantId: "p3", mode: "even", value: 0 },
    ],
    createdAt: 1000,
    updatedAt: 2000,
    ...overrides,
  };
}

describe("홈 화면 `/` (최근 내역)", () => {
  it("AC-1[P0]: 최근 정산을 내림차순 카드(title·참여자 수·총액)로 렌더한다", async () => {
    const older = makeSettlement({ id: "s-old", title: "회식", updatedAt: 1000 });
    const newer = makeSettlement({ id: "s-new", title: "제주도 여행", updatedAt: 5000 });
    // storage already returns updatedAt desc — Home renders in the order it receives.
    getRecentSettlements.mockReturnValue([newer, older]);

    renderWithRouter(React.createElement(Home));

    const newCard = await screen.findByTestId("settlement-card-s-new");
    const oldCard = await screen.findByTestId("settlement-card-s-old");

    expect(within(newCard).getByText("제주도 여행")).toBeInTheDocument();
    expect(within(newCard).getByText(/3명/)).toBeInTheDocument();
    expect(within(newCard).getByText(/290,000/)).toBeInTheDocument(); // total = 200000 + 90000
    expect(within(oldCard).getByText("회식")).toBeInTheDocument();

    // rendered order must follow the (already-descending) storage order: newer first
    const allCards = screen.getAllByTestId(/^settlement-card-/);
    expect(allCards[0]).toBe(newCard);
    expect(allCards[1]).toBe(oldCard);
  });

  it("AC-2[P0]: '새 정산 시작' 버튼(전체폭) 탭 시 /new로 이동한다", async () => {
    getRecentSettlements.mockReturnValue([makeSettlement()]);
    renderWithRouter(React.createElement(Home));

    await screen.findByTestId("settlement-card-s1");
    const button = screen.getByRole("button", { name: "새 정산 시작" });
    expect(button).toHaveAttribute("display", "block");

    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/new");
  });

  it("AC-3: 카드 탭 시 /result로 settlementId와 함께 이동한다", async () => {
    getRecentSettlements.mockReturnValue([makeSettlement({ id: "s-abc" })]);
    renderWithRouter(React.createElement(Home));

    const card = await screen.findByTestId("settlement-card-s-abc");
    fireEvent.click(card);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/result", { state: { settlementId: "s-abc" } });
  });

  it("AC-4: 빈 배열이면 빈 상태만 렌더하고 리스트는 렌더하지 않는다", async () => {
    getRecentSettlements.mockReturnValue([]);
    renderWithRouter(React.createElement(Home));

    await waitFor(() => {
      expect(screen.getByText("아직 정산 내역이 없어요")).toBeInTheDocument();
    });

    expect(document.querySelector("[data-content-icon]")).not.toBeNull();
    expect(screen.queryAllByTestId(/^settlement-card-/)).toHaveLength(0);
    // CTA to start a new settlement must still be present in the empty state
    expect(screen.getByRole("button", { name: "새 정산 시작" })).toBeInTheDocument();
  });

  it("AC-5: 초기 마운트 시 스켈레톤 3개를 보여준 뒤 실제 리스트로 교체한다", async () => {
    getRecentSettlements.mockReturnValue([makeSettlement()]);
    renderWithRouter(React.createElement(Home));

    // First frame: skeleton placeholders, no real data yet
    expect(document.querySelectorAll('[data-skeleton="true"]')).toHaveLength(3);
    expect(screen.queryByTestId("settlement-card-s1")).not.toBeInTheDocument();

    // After the settlements resolve, skeleton is gone and the real card is shown
    await screen.findByTestId("settlement-card-s1");
    expect(document.querySelectorAll('[data-skeleton="true"]')).toHaveLength(0);
  });

  it("AC-6[P0]: 카드 길게 누름 → 삭제 확인 → deleteSettlement 호출 후 목록에서 제거되고 토스트가 뜬다", async () => {
    getRecentSettlements.mockReturnValue([makeSettlement({ id: "s1" })]);
    deleteSettlement.mockReturnValue({ ok: true });
    renderWithRouter(React.createElement(Home));

    const card = await screen.findByTestId("settlement-card-s1");
    fireEvent.contextMenu(card); // long-press equivalent

    const sheet = await screen.findByRole("dialog");
    fireEvent.click(within(sheet).getByRole("button", { name: "삭제" }));

    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "삭제" }));

    expect(deleteSettlement).toHaveBeenCalledTimes(1);
    expect(deleteSettlement).toHaveBeenCalledWith("s1");

    await waitFor(() => {
      expect(screen.queryByTestId("settlement-card-s1")).not.toBeInTheDocument();
    });
    expect(screen.getByText("삭제되었어요")).toBeInTheDocument();
  });

  it("AC-6b: 삭제를 취소하면 deleteSettlement가 호출되지 않고 카드가 남는다", async () => {
    getRecentSettlements.mockReturnValue([makeSettlement({ id: "s1" })]);
    renderWithRouter(React.createElement(Home));

    const card = await screen.findByTestId("settlement-card-s1");
    fireEvent.contextMenu(card);

    const sheet = await screen.findByRole("dialog");
    fireEvent.click(within(sheet).getByRole("button", { name: "삭제" }));

    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }));

    expect(deleteSettlement).not.toHaveBeenCalled();
    expect(screen.getByTestId("settlement-card-s1")).toBeInTheDocument();
  });
});
