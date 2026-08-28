import { expect, test } from "@playwright/test";

for (const route of ["/", "/login", "/register"]) {
  test(`renders the public route ${route} without browser errors`, async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on("pageerror", error => runtimeErrors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error" && !message.text().includes("Failed to load resource: the server responded with a status of 401 ()")) {
        runtimeErrors.push(message.text());
      }
    });

    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main")).toBeVisible();
    expect(runtimeErrors).toEqual([]);
  });
}
