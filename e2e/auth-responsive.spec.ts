import { expect, test, type Page } from "@playwright/test";

test.describe("mobile-first authentication", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens Login directly on the form", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await mockUnauthenticatedSession(page);

    await page.goto("/login?returnTo=%2Ftransactions", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Work email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sign in once, then get back to work." })).toBeHidden();
    await expect(page.getByRole("link", { name: "Back to Aries" })).toBeHidden();
    expect((await page.getByLabel("Work email").boundingBox())?.y).toBeLessThan(320);
    expect(await hasHorizontalOverflow(page)).toBe(false);
    expect(runtimeErrors).toEqual([]);
  });

  test("opens Registration directly on the form", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await mockUnauthenticatedSession(page);

    await page.goto("/register?returnTo=%2Foverview", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Create your workspace account" })).toBeVisible();
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    expect((await page.getByLabel("Full name").boundingBox())?.y).toBeLessThan(300);
    expect(await hasHorizontalOverflow(page)).toBe(false);
    expect(runtimeErrors).toEqual([]);
  });
});

test("retains the explanatory Login layout on desktop", async ({ page }) => {
  await mockUnauthenticatedSession(page);

  await page.goto("/login", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Sign in once, then get back to work." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Aries" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
});

async function mockUnauthenticatedSession(page: Page) {
  await page.route("**/api/v1/auth/refresh", route => route.fulfill({
    status: 401,
    contentType: "application/json",
    headers: {
      "Access-Control-Allow-Origin": "http://localhost:3000",
      "Access-Control-Allow-Credentials": "true",
    },
    body: JSON.stringify({ message: "Unauthenticated", code: "UNAUTHORIZED", requestId: "auth-responsive" }),
  }));
}

async function hasHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource: the server responded with a status of 401")) errors.push(message.text());
  });
  return errors;
}
