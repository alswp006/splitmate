import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockRouter, mockLocation } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockTds();
mockAppsInToss();
mockRouter();

vi.mock("@/lib/storage", () => ({
  getSettlementById: vi.fn(() => ({
    id: "s1",
    title: "t",
    participants: [{ id: "p1", name: "지민" }],
    items: [{ id: "i1", label: "저녁", amount: 40000, participantIds: ["p1"] }],
    splitRules: [{ participantId: "p1", mode: "even", value: 0 }],
    createdAt: 1,
    updatedAt: 1,
  })),
}));
vi.mock("@/lib/transfer", () => ({ requestTransfer: vi.fn(async () => true) }));

const tossRewardAdSlotIds: unknown[] = [];
console.log("REGISTERING MOCK FACTORY");
vi.mock("@/components/TossRewardAd", () => {
  console.log("FACTORY INVOKED");
  return {
    TossRewardAd: (props: { slotId?: string; children: React.ReactNode }) => {
      console.log("MOCK COMPONENT RENDERED", props.slotId);
      tossRewardAdSlotIds.push(props.slotId);
      return props.children;
    },
  };
});

import Result from "@/pages/Result";

describe("probe-granular", () => {
  beforeEach(() => {
    tossRewardAdSlotIds.length = 0;
  });

  it("renders TossRewardAd mock on share click", () => {
    mockLocation.state = { settlementId: "s1" };
    renderWithRouter(React.createElement(Result), { initialEntries: ["/result"] });
    fireEvent.click(screen.getByRole("button", { name: /정산 내역 공유/ }));
    console.log("SLOT IDS:", JSON.stringify(tossRewardAdSlotIds));
    expect(tossRewardAdSlotIds.length).toBeGreaterThanOrEqual(1);
  });
});
