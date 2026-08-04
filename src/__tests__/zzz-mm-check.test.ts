import { describe, it, expect } from "vitest";
describe("matchMedia check", () => {
  it("check", () => {
    console.log("typeof matchMedia:", typeof window.matchMedia);
    if (typeof window.matchMedia === "function") {
      try {
        const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
        console.log("mql.matches:", mql.matches);
      } catch (e) {
        console.log("threw:", e);
      }
    }
    expect(true).toBe(true);
  });
});
