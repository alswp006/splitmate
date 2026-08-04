import { describe, it, expect } from "vitest";
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockTds();
mockAppsInToss();
mockTossRewardAd();

import App from "@/App";

describe("debug nav", () => {
  it("navigates", async () => {
    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });
    const btn = await screen.findByRole("button", { name: /새 정산 시작/ });
    fireEvent.click(btn);
    await new Promise((r) => setTimeout(r, 50));
    screen.debug(undefined, 3000);
  });
});
