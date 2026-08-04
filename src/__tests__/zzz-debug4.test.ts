import { describe, it } from "vitest";
import React from "react";
import { screen, fireEvent, render, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";

mockTds();
mockAppsInToss();
mockTossRewardAd();

import Home from "@/pages/Home";

function LocationProbe() {
  const loc = useLocation();
  return React.createElement("div", { "data-testid": "probe" }, loc.pathname);
}

describe("debug4", () => {
  it("navigates from Home directly", async () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/"] },
        React.createElement(LocationProbe),
        React.createElement(Routes, null,
          React.createElement(Route, { path: "/", element: React.createElement(Home) }),
          React.createElement(Route, { path: "/new", element: React.createElement("div", null, "NEWPAGE") }),
        ),
      ),
    );
    const btn = await screen.findByRole("button", { name: /새 정산 시작/ });
    console.log("clicking", btn.outerHTML);
    fireEvent.click(btn);
    console.log("after (sync):", screen.getByTestId("probe").textContent);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    console.log("after (async):", screen.getByTestId("probe").textContent);
    screen.debug(undefined, 5000);
  });
});
