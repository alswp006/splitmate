import { describe, it } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockRouter, mockLocation } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { vi } from "vitest";

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

import Result from "@/pages/Result";

describe("debug6-no-mock-tossrewardad", () => {
  it("renders real TossRewardAd (no mock)", () => {
    mockLocation.state = { settlementId: "s1" };
    renderWithRouter(React.createElement(Result), { initialEntries: ["/result"] });
    console.log("BEFORE CLICK ===================");
    console.log(document.body.innerHTML.slice(0, 2000));
    fireEvent.click(screen.getByRole("button", { name: /정산 내역 공유/ }));
    console.log("AFTER CLICK ===================");
    console.log(document.body.innerHTML.slice(0, 4000));
  });
});
