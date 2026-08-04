import { describe, it, expect } from "vitest";
import React from "react";
import { screen, fireEvent, within } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { mockAll, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, mockAppState } from "@/__tests__/__helpers__/test-utils";

mockAll();
mockAppState();

import Items from "@/pages/Items";

const LABEL_PLACEHOLDER = "항목 이름을 입력해 주세요";
const AMOUNT_PLACEHOLDER = "금액을 입력해 주세요";

const PARTICIPANTS = [
  { id: "p-jimin", name: "지민" },
  { id: "p-hyunwoo", name: "현우" },
];

function getLabelInput() {
  return screen.getByPlaceholderText(LABEL_PLACEHOLDER) as HTMLInputElement;
}

function getAmountInput() {
  return screen.getByPlaceholderText(AMOUNT_PLACEHOLDER) as HTMLInputElement;
}

function selectParticipant(name: string) {
  fireEvent.click(screen.getByTestId(`item-participant-chip-${name}`));
}

function addItem(label: string, amount: string, participants: string[]) {
  fireEvent.change(getLabelInput(), { target: { value: label } });
  fireEvent.change(getAmountInput(), { target: { value: amount } });
  participants.forEach(selectParticipant);
  fireEvent.click(screen.getByRole("button", { name: "항목 추가" }));
}

function renderItems(state: unknown) {
  mockLocation.state = state;
  return renderWithRouter(
    React.createElement(
      Routes,
      null,
      React.createElement(Route, { path: "/new/items", element: React.createElement(Items) }),
      React.createElement(Route, {
        path: "/",
        element: React.createElement("div", { "data-testid": "home-stub" }, "홈"),
      }),
    ),
    { initialEntries: ["/new/items"] },
  );
}

describe("항목 입력 `/new/items` (금액·인원 지정)", () => {
  it("AC-1[P0]: location.state가 없으면 홈으로 안전 이탈한다(.map on undefined 없음)", () => {
    expect(() => renderItems(null)).not.toThrow();

    expect(screen.getByTestId("home-stub")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(LABEL_PLACEHOLDER)).not.toBeInTheDocument();
  });

  it("AC-2[P0]: 항목명+금액 입력 후 참여자 2명 선택하고 '항목 추가' 클릭 시 리스트에 추가되고 총합이 45,000이 된다", () => {
    renderItems({ title: "여름 여행", participants: PARTICIPANTS });

    addItem("스테이크", "45000", ["지민", "현우"]);

    expect(screen.getByTestId("item-row-스테이크")).toBeInTheDocument();
    expect(within(screen.getByTestId("item-row-스테이크")).getByText(/45,000/)).toBeInTheDocument();
    expect(screen.getByTestId("items-total")).toHaveTextContent("45,000");
  });

  it("AC-3: 금액 입력 필드는 inputMode='numeric'이고 입력값을 콤마 포맷으로 표시한다", () => {
    renderItems({ title: "여름 여행", participants: PARTICIPANTS });

    expect(getAmountInput().inputMode).toBe("numeric");

    fireEvent.change(getAmountInput(), { target: { value: "45000" } });

    expect(getAmountInput().value).toBe("45,000");
  });

  it("AC-4[P0]: 항목이 1개 이상이면 '다음' 클릭 시 title·participants·items를 담아 /new/split으로 이동한다", () => {
    renderItems({ title: "여름 여행", participants: PARTICIPANTS });

    addItem("스테이크", "45000", ["지민", "현우"]);
    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const [path, options] = mockNavigate.mock.calls[0];
    expect(path).toBe("/new/split");
    expect(options.state.title).toBe("여름 여행");
    expect(options.state.participants).toEqual(PARTICIPANTS);
    expect(options.state.items).toHaveLength(1);
    expect(options.state.items[0]).toMatchObject({
      label: "스테이크",
      amount: 45000,
      participantIds: ["p-jimin", "p-hyunwoo"],
    });
  });

  it("AC-5a: 금액이 0 이하면 '금액을 1원 이상 입력해주세요' 에러를 띄우고 항목을 추가하지 않는다", () => {
    renderItems({ title: "여름 여행", participants: PARTICIPANTS });

    addItem("스테이크", "0", ["지민"]);

    expect(screen.getByText("금액을 1원 이상 입력해주세요")).toBeInTheDocument();
    expect(screen.queryByTestId("item-row-스테이크")).not.toBeInTheDocument();
  });

  it("AC-5b: 참여자를 선택하지 않으면 '이 항목을 나눌 참여자를 선택해주세요' 에러를 띄우고 항목을 추가하지 않는다", () => {
    renderItems({ title: "여름 여행", participants: PARTICIPANTS });

    addItem("스테이크", "45000", []);

    expect(screen.getByText("이 항목을 나눌 참여자를 선택해주세요")).toBeInTheDocument();
    expect(screen.queryByTestId("item-row-스테이크")).not.toBeInTheDocument();
  });

  it("AC-6[P0]: 항목이 0개이면 균등 분할 안내가 뜨고 '다음'은 활성 상태다", () => {
    renderItems({ title: "여름 여행", participants: PARTICIPANTS });

    expect(screen.getByText("항목이 없으면 총액을 똑같이 나눠요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음" })).not.toBeDisabled();
  });

  it("AC-6b: 항목 삭제 시 총합이 재계산되고 0개가 되면 균등 분할 안내가 다시 뜬다", () => {
    renderItems({ title: "여름 여행", participants: PARTICIPANTS });

    addItem("스테이크", "45000", ["지민"]);
    expect(screen.getByTestId("items-total")).toHaveTextContent("45,000");
    expect(screen.queryByText("항목이 없으면 총액을 똑같이 나눠요")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "스테이크 삭제" }));

    expect(screen.queryByTestId("item-row-스테이크")).not.toBeInTheDocument();
    expect(screen.getByTestId("items-total")).toHaveTextContent("0");
    expect(screen.getByText("항목이 없으면 총액을 똑같이 나눠요")).toBeInTheDocument();
  });
});
