import { describe, it, expect } from "vitest";
import { useLocation } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";

mockTds();
mockAppsInToss();
mockTossRewardAd();

import { pagesUseLocation } from "@/pages/zzz-probe";

describe("identity", () => {
  it("pages useLocation vs test useLocation", () => {
    // eslint-disable-next-line no-console
    console.log("PAGES_SAME=", useLocation === pagesUseLocation);
    expect(true).toBe(true);
  });
});
