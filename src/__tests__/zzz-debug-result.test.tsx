import { describe, it, expect, vi } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockAll, mockLocation } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockAll();

const getSettlementByIdMock = vi.fn();
vi.mock("@/lib/storage", () => ({ getSettlementById: (id: string) => getSettlementByIdMock(id) }));
vi.mock("@/lib/transfer", () => ({ requestTransfer: vi.fn() }));

const tossRewardAdSlotIds: unknown[] = [];
vi.mock("@/components/TossRewardAd", () => ({
  TossRewardAd: (props: { slotId?: string; children: React.ReactNode }) => {
    tossRewardAdSlotIds.push(props.slotId);
    return props.children;
  },
}));

import Result from "@/pages/Result";

describe("debug", () => {
  it("tracks slotId", () => {
    getSettlementByIdMock.mockReturnValue({
      id: "s1", title: "t",
      participants: [{ id: "p1", name: "지민" }, { id: "p2", name: "현우" }],
      items: [{ id: "i1", label: "저녁", amount: 40000, participantIds: ["p1", "p2"] }],
      splitRules: [{ participantId: "p1", mode: "even", value: 0 }, { participantId: "p2", mode: "even", value: 0 }],
      createdAt: 1, updatedAt: 1,
    });
    mockLocation.state = { settlementId: "s1" };
    renderWithRouter(React.createElement(Result), { initialEntries: ["/result"] });
    fireEvent.click(screen.getByRole("button", { name: /정산 내역 공유/ }));
    console.log("slotIds:", tossRewardAdSlotIds);
  });
});
