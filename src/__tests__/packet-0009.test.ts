import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent, within } from "@testing-library/react";
import { mockAll, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { Settlement } from "@/lib/types";

mockAll();

// ── @/lib/storage — settlement lookup ──
const getSettlementByIdMock = vi.fn();
vi.mock("@/lib/storage", () => ({
  getSettlementById: (id: string) => getSettlementByIdMock(id),
}));

// ── @/lib/transfer — 토스 송금 딥링크 ──
const requestTransferMock = vi.fn();
vi.mock("@/lib/transfer", () => ({
  requestTransfer: (amount: number, name?: string) => requestTransferMock(amount, name),
}));

// ── @/components/TossRewardAd — spy on slotId + render children immediately ──
const tossRewardAdSlotIds: unknown[] = [];
vi.mock("@/components/TossRewardAd", () => ({
  TossRewardAd: (props: { slotId?: string; children: React.ReactNode }) => {
    tossRewardAdSlotIds.push(props.slotId);
    return props.children;
  },
}));

import Result from "@/pages/Result";

const SETTLEMENT: Settlement = {
  id: "s1",
  title: "여름 여행",
  participants: [
    { id: "p1", name: "지민" },
    { id: "p2", name: "현우" },
  ],
  items: [{ id: "i1", label: "저녁", amount: 40000, participantIds: ["p1", "p2"] }],
  splitRules: [
    { participantId: "p1", mode: "even", value: 0 },
    { participantId: "p2", mode: "even", value: 0 },
  ],
  createdAt: 1000,
  updatedAt: 1000,
};

function renderResult(state: unknown) {
  mockLocation.state = state;
  return renderWithRouter(React.createElement(Result), { initialEntries: ["/result"] });
}

describe("결과 화면 `/result` (배너 + 리워드 공유 + 송금)", () => {
  beforeEach(() => {
    getSettlementByIdMock.mockReset();
    requestTransferMock.mockReset();
    mockNavigate.mockClear();
    tossRewardAdSlotIds.length = 0;
  });

  it("AC-1[P0]: settlementId로 정산을 조회해 렌더한다", () => {
    getSettlementByIdMock.mockReturnValue(SETTLEMENT);

    renderResult({ settlementId: "s1" });

    expect(getSettlementByIdMock).toHaveBeenCalledWith("s1");
    expect(screen.getByTestId("total-hero")).toBeInTheDocument();
  });

  it("AC-1[P0-error]: 조회된 정산이 없으면 크래시 없이 빈 상태와 '홈으로' 버튼을 보여준다", () => {
    getSettlementByIdMock.mockReturnValue(null);

    expect(() => renderResult({ settlementId: "missing" })).not.toThrow();

    expect(screen.getByText("정산을 찾을 수 없어요")).toBeInTheDocument();
    const homeButton = screen.getByRole("button", { name: /홈으로/ });
    fireEvent.click(homeButton);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("AC-2[P0]: 총액 히어로와 참여자별 부담액 카드를 렌더하고 카드 합계가 총액과 같다", () => {
    getSettlementByIdMock.mockReturnValue(SETTLEMENT);

    renderResult({ settlementId: "s1" });

    expect(screen.getByTestId("total-hero")).toHaveTextContent(/40,000/);

    const cards = screen.getAllByTestId("share-card");
    expect(cards).toHaveLength(2);

    const jiminCard = cards.find((card) => within(card).queryByText("지민"));
    const hyunwooCard = cards.find((card) => within(card).queryByText("현우"));
    expect(jiminCard).toBeTruthy();
    expect(hyunwooCard).toBeTruthy();
    expect(within(jiminCard!).getByText(/20,000/)).toBeInTheDocument();
    expect(within(hyunwooCard!).getByText(/20,000/)).toBeInTheDocument();

    const cardTotal = 20000 + 20000;
    expect(cardTotal).toBe(SETTLEMENT.items[0].amount);
  });

  it("AC-3[P0]: 참여자 카드 리스트 아래에 배너 광고 AdSlot을 배치한다", () => {
    getSettlementByIdMock.mockReturnValue(SETTLEMENT);

    const { container } = renderResult({ settlementId: "s1" });

    const adSlot = container.querySelector(".ad-slot");
    expect(adSlot).not.toBeNull();
    expect(adSlot?.compareDocumentPosition(screen.getAllByTestId("share-card")[0])).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    );
  });

  it("AC-4[P0]: '정산 내역 공유' 탭 시 TossRewardAd로 공유 옵션을 게이팅한다", () => {
    getSettlementByIdMock.mockReturnValue(SETTLEMENT);

    renderResult({ settlementId: "s1" });

    expect(screen.queryByText("텍스트 복사")).not.toBeInTheDocument();
    expect(tossRewardAdSlotIds).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /정산 내역 공유/ }));

    expect(tossRewardAdSlotIds.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("텍스트 복사")).toBeInTheDocument();
  });

  it("AC-5[P0]: 참여자 송금 탭 시 requestTransfer(amount)가 정수 금액으로 호출된다", async () => {
    getSettlementByIdMock.mockReturnValue(SETTLEMENT);
    requestTransferMock.mockResolvedValue(true);

    renderResult({ settlementId: "s1" });

    fireEvent.click(screen.getByTestId("transfer-button-지민"));

    expect(requestTransferMock).toHaveBeenCalledTimes(1);
    expect(requestTransferMock.mock.calls[0][0]).toBe(20000);
  });

  it("AC-5[P0-error]: 송금 딥링크가 실패하면 '송금 화면을 열 수 없어요' Toast로 폴백한다", async () => {
    getSettlementByIdMock.mockReturnValue(SETTLEMENT);
    requestTransferMock.mockResolvedValue(false);

    renderResult({ settlementId: "s1" });

    fireEvent.click(screen.getByTestId("transfer-button-지민"));

    const toast = await screen.findByText("송금 화면을 열 수 없어요");
    expect(toast).toBeInTheDocument();
  });
});
