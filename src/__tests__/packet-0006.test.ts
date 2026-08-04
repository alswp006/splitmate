import { describe, it, expect } from "vitest";
import React from "react";
import { screen, fireEvent, within } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, mockAppState } from "@/__tests__/__helpers__/test-utils";

mockAll();
mockAppState();

import NewSettlement from "@/pages/NewSettlement";

const NAME_PLACEHOLDER = "이름을 입력해 주세요";
const TITLE_PLACEHOLDER = "정산 제목을 입력해 주세요";

function getNameInput() {
  return screen.getByPlaceholderText(NAME_PLACEHOLDER) as HTMLInputElement;
}

function getTitleInput() {
  return screen.getByPlaceholderText(TITLE_PLACEHOLDER) as HTMLInputElement;
}

function addParticipant(name: string) {
  fireEvent.change(getNameInput(), { target: { value: name } });
  fireEvent.click(screen.getByRole("button", { name: "추가" }));
}

describe("기본 정보 입력 `/new` (제목·참여자)", () => {
  it("AC-1: 이름 입력 후 '추가' 클릭 시 Chip이 추가되고 입력 필드가 비워진다", () => {
    renderWithRouter(React.createElement(NewSettlement));

    addParticipant("지민");

    expect(screen.getByTestId("participant-chip-지민")).toBeInTheDocument();
    expect(within(screen.getByTestId("participant-chip-지민")).getByText(/지민/)).toBeInTheDocument();
    expect(getNameInput().value).toBe("");
  });

  it("AC-2: 참여자 2명 이상 + 제목 입력 후 '다음' 클릭 시 /new/items로 title·participants를 전달한다", () => {
    renderWithRouter(React.createElement(NewSettlement));

    fireEvent.change(getTitleInput(), { target: { value: "여름 여행" } });
    addParticipant("민제");
    addParticipant("지은");

    const nextButton = screen.getByRole("button", { name: "다음" });
    expect(nextButton).not.toBeDisabled();
    fireEvent.click(nextButton);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const [path, options] = mockNavigate.mock.calls[0];
    expect(path).toBe("/new/items");
    expect(options.state.title).toBe("여름 여행");
    expect(options.state.participants).toHaveLength(2);
    expect(options.state.participants.map((p: { name: string }) => p.name)).toEqual([
      "민제",
      "지은",
    ]);
    expect(typeof options.state.participants[0].id).toBe("string");
    expect(options.state.participants[0].id.length).toBeGreaterThan(0);
  });

  it("AC-3: 참여자가 1명 이하이면 '다음'이 비활성화되고 안내 문구가 뜬다", () => {
    renderWithRouter(React.createElement(NewSettlement));

    // 참여자 0명(초기 상태)
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
    expect(screen.getByText("참여자를 2명 이상 추가해주세요")).toBeInTheDocument();

    // 참여자 1명
    fireEvent.change(getTitleInput(), { target: { value: "회식" } });
    addParticipant("현우");

    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
    expect(screen.getByText("참여자를 2명 이상 추가해주세요")).toBeInTheDocument();
  });

  it("AC-4: 중복 이름 추가 시 에러 문구가 뜨고 Chip이 늘어나지 않는다", () => {
    renderWithRouter(React.createElement(NewSettlement));

    addParticipant("지민");
    expect(screen.getByTestId("participant-chip-지민")).toBeInTheDocument();

    addParticipant("지민");

    expect(screen.getByText("이미 추가된 이름이에요")).toBeInTheDocument();
    expect(screen.getAllByTestId("participant-chip-지민")).toHaveLength(1);
  });

  it("AC-5: 공백 포함/11자 이상 이름은 '이름은 1~10자로 입력해주세요' 에러를 띄우고 추가되지 않는다", () => {
    renderWithRouter(React.createElement(NewSettlement));

    // 공백 포함
    addParticipant("김 민서");
    expect(screen.getByText("이름은 1~10자로 입력해주세요")).toBeInTheDocument();
    expect(screen.queryByTestId("participant-chip-김 민서")).not.toBeInTheDocument();

    // 11자 (한글 11자)
    addParticipant("가나다라마바사아자차카");
    expect(screen.getByText("이름은 1~10자로 입력해주세요")).toBeInTheDocument();
    expect(screen.queryByTestId("participant-chip-가나다라마바사아자차카")).not.toBeInTheDocument();
  });

  it("AC-6a: 이름 입력 후 Enter로도 Chip이 추가된다", () => {
    renderWithRouter(React.createElement(NewSettlement));

    fireEvent.change(getNameInput(), { target: { value: "서연" } });
    fireEvent.keyDown(getNameInput(), { key: "Enter", code: "Enter", charCode: 13 });

    expect(screen.getByTestId("participant-chip-서연")).toBeInTheDocument();
    expect(getNameInput().value).toBe("");
  });

  it("AC-6b: Chip을 탭하면 해당 참여자가 목록에서 제거된다", () => {
    renderWithRouter(React.createElement(NewSettlement));

    addParticipant("민제");
    addParticipant("지은");
    expect(screen.getByTestId("participant-chip-민제")).toBeInTheDocument();
    expect(screen.getByTestId("participant-chip-지은")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("participant-chip-민제"));

    expect(screen.queryByTestId("participant-chip-민제")).not.toBeInTheDocument();
    expect(screen.getByTestId("participant-chip-지은")).toBeInTheDocument();
  });
});
