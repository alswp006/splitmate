import { describe, it, vi } from "vitest";
import React from "react";
import { screen } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

// Inline minimal mocks — do NOT import mocks.ts (test the hoisting hypothesis)
vi.mock("@toss/tds-mobile", () => {
  const mk = (tag: string) => ({ children, title, ...p }: any) =>
    React.createElement(tag, p, title, children);
  return new Proxy(
    {},
    {
      get: () =>
        Object.assign(mk("div"), { Text: mk("span"), Texts: mk("span"), TitleParagraph: mk("h1"), AlertButton: mk("button"), Header: mk("div"), Item: mk("button"), ContentIcon: mk("span"), Icon: mk("span"), Image: mk("img") }),
    },
  );
});
vi.mock("@apps-in-toss/web-framework", () => ({ generateHapticFeedback: vi.fn() }));

import Items from "@/pages/Items";

describe("mydebug-noimport", () => {
  it("items", () => {
    renderWithRouter(
      React.createElement(Routes, null,
        React.createElement(Route, { path: "/new/items", element: React.createElement(Items) }),
        React.createElement(Route, { path: "/", element: React.createElement("div", null, "HOMESTUB") }),
      ),
      {
        initialEntries: [
          { pathname: "/new/items", state: { title: "제주 여행", participants: [{ id: "p1", name: "지민" }] } },
        ],
      },
    );
    console.log("RESULT:", screen.queryByText("항목 입력") ? "RENDERED" : "HOME");
  });
});
