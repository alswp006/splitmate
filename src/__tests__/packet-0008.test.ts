import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { mockAll, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockAll();

const saveSettlementMock = vi.fn((settlement: any) => ({ ok: true, settlement }));
vi.mock("@/lib/storage", () => ({
  saveSettlement: (settlement: unknown) => saveSettlementMock(settlement),
}));

import Split from "@/pages/Split";

const PARTICIPANTS = [
  { id: "p1", name: "지민" },
  { id: "p2", name: "현우" },
  { id: "p3", name: "서연" },
];

const ITEMS = [
  { id: "i1", label: "저녁", amount: 30000, participantIds: ["p1", "p2", "p3"] },
];

function renderSplit(state: unknown) {
  mockLocation.state = state;
  return renderWithRouter(
    React.createElement(
      Routes,
      null,
      React.createElement(Route, { path: "/new/split", element: React.createElement(Split) }),
      React.createElement(Route, {
        path: "/",
        element: React.createElement("div", { "data-testid": "home-stub" }, "홈"),
      }),
    ),
    { initialEntries: ["/new/split"] },
  );
}

function selectMode(name: string, mode: "even" | "ratio" | "fixed" | "excluded") {
  fireEvent.click(screen.getByTestId(`split-mode-chip-${name}-${mode}`));
}

function setValue(name: string, value: string) {
  fireEvent.change(screen.getByTestId(`split-value-input-${name}`), { target: { value } });
}

function clickResult() {
  fireEvent.click(screen.getByRole("button", { name: /결과 보기/ }));
}

describe("분할 설정 `/new/split` (계산 실행 + 저장)", () => {
  beforeEach(() => {
    saveSettlementMock.mockClear();
  });

  it("AC-1[P0]: location.state가 없으면 홈으로 안전 이탈한다", () => {
    expect(() => renderSplit(null)).not.toThrow();

    expect(screen.getByTestId("home-stub")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-2: 참여자마다 행이 렌더되고 기본 모드는 균등이며, 비율 모드를 선택하면 TextField가 나타난다", () => {
    renderSplit({ title: "여름 여행", participants: PARTICIPANTS, items: ITEMS });

    expect(screen.getByTestId("split-participant-row-지민")).toBeInTheDocument();
    expect(screen.getByTestId("split-participant-row-현우")).toBeInTheDocument();
    expect(screen.getByTestId("split-participant-row-서연")).toBeInTheDocument();
    expect(screen.getByTestId("split-mode-chip-지민-even").getAttribute("aria-pressed")).toBe(
      "true",
    );

    expect(screen.queryByTestId("split-value-input-지민")).not.toBeInTheDocument();
    selectMode("지민", "ratio");
    expect(screen.getByTestId("split-value-input-지민")).toBeInTheDocument();
  });

  it("AC-3[P0]: 고정 금액 합이 총액을 초과하면 이동하지 않고 인라인 에러를 표시한다", () => {
    renderSplit({ title: "여름 여행", participants: PARTICIPANTS, items: ITEMS });

    selectMode("지민", "fixed");
    setValue("지민", "20000");
    selectMode("현우", "fixed");
    setValue("현우", "20000");

    clickResult();

    expect(screen.getByText("고정 금액 합이 총액을 초과했어요")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(saveSettlementMock).not.toHaveBeenCalled();
  });

  it("AC-4[P0]: 전원 제외 상태면 '결과 보기' 탭 시 최소 1명 필요 에러를 표시하고 이동하지 않는다", () => {
    renderSplit({ title: "여름 여행", participants: PARTICIPANTS, items: ITEMS });

    selectMode("지민", "excluded");
    selectMode("현우", "excluded");
    selectMode("서연", "excluded");

    clickResult();

    expect(screen.getByText("최소 1명은 정산에 포함되어야 해요")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(saveSettlementMock).not.toHaveBeenCalled();
  });

  it("AC-5: '결과 보기'를 연달아 두 번 탭해도 계산·저장·이동은 한 번만 일어난다", () => {
    renderSplit({ title: "여름 여행", participants: PARTICIPANTS, items: ITEMS });

    clickResult();
    clickResult();

    expect(saveSettlementMock).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it("AC-6[P0]: 계산에 성공하면 saveSettlement로 저장한 뒤 settlementId와 함께 /result로 이동한다", () => {
    renderSplit({ title: "여름 여행", participants: PARTICIPANTS, items: ITEMS });

    clickResult();

    expect(saveSettlementMock).toHaveBeenCalledTimes(1);
    const savedSettlement = saveSettlementMock.mock.calls[0][0];
    expect(savedSettlement.title).toBe("여름 여행");
    expect(savedSettlement.participants).toEqual(PARTICIPANTS);
    expect(savedSettlement.items).toEqual(ITEMS);
    expect(savedSettlement.splitRules).toHaveLength(3);
    expect(
      savedSettlement.splitRules.every((rule: { mode: string }) => rule.mode === "even"),
    ).toBe(true);

    expect(mockNavigate).toHaveBeenCalledWith("/result", {
      state: { settlementId: savedSettlement.id },
    });
  });
});
