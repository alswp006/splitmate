import { describe, it } from "vitest";
import React from "react";
import { screen, fireEvent, render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";

mockTds();
mockAppsInToss();
mockTossRewardAd();

import App from "@/App";

function LocationProbe() {
  const loc = useLocation();
  return React.createElement("div", { "data-testid": "probe" }, loc.pathname);
}

describe("debug3", () => {
  it("navigates within App", async () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/"] },
        React.createElement(LocationProbe),
        React.createElement(App),
      ),
    );
    console.log("before:", screen.getByTestId("probe").textContent);
    const btn = await screen.findByRole("button", { name: /새 정산 시작/ });
    fireEvent.click(btn);
    console.log("after:", screen.getByTestId("probe").textContent);
  });
});
