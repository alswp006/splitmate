import { test } from "@playwright/test";
test("debug network", async ({ page }) => {
  page.on("requestfailed", (r) => console.log("FAILED:", r.url(), r.failure()?.errorText));
  page.on("response", (r) => { if (r.status() >= 400) console.log("BAD STATUS:", r.status(), r.url()); });
  await page.goto("/");
  await page.waitForTimeout(1500);
});
