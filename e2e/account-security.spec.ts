import { expect, test, type BrowserContext, type Route } from "@playwright/test";

const user = { id: "security-user", fullName: "Aries Test User", email: "security@example.test", role: "USER", isActive: true, emailVerified: false, createdAt: "2026-09-01T00:00:00Z" };
const auth = { accessToken: "synthetic-browser-access", tokenType: "Bearer", expiresIn: 900, user };

async function mockApi(context: BrowserContext, options: { active?: boolean; handle?: (route: Route) => Promise<boolean> } = {}) {
  const state = { active: options.active ?? false, refreshes: 0, accountReads: 0 };
  await context.route("**/api/v1/**", async route => {
    const request = route.request();
    if (request.method() === "OPTIONS") { await json(route, null, 204); return; }
    if (await options.handle?.(route)) return;
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/auth/refresh")) {
      state.refreshes++;
      await json(route, state.active ? { success: true, data: auth } : { code: "UNAUTHORIZED" }, state.active ? 200 : 401); return;
    }
    if (path.endsWith("/auth/me")) { await json(route, state.active ? { success: true, data: user } : { code: "UNAUTHORIZED" }, state.active ? 200 : 401); return; }
    if (path.endsWith("/accounts")) { state.accountReads++; await json(route, { success: true, data: [] }); return; }
    if (path.endsWith("/notifications/unread-count")) { await json(route, { success: true, data: { unreadCount: 0 } }); return; }
    if (path.endsWith("/notifications/preferences")) { await json(route, { success: true, data: { transactionEmailEnabled: true, webhookAlertEmailEnabled: false, emailVerified: false, version: 0 } }); return; }
    await json(route, { code: "NOT_FOUND" }, 404);
  });
  return state;
}

async function json(route: Route, body: unknown, status = 200) {
  const origin = route.request().headers().origin ?? "http://localhost:3000";
  await route.fulfill({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" }, body: status === 204 ? undefined : JSON.stringify(body) });
}

test("public recovery accepts generically and does not attach an existing access token", async ({ page, context }) => {
  let calls = 0;
  let authorization: string | undefined;
  await mockApi(context, { active: true, handle: async route => {
    if (!route.request().url().endsWith("/auth/forgot-password")) return false;
    calls++; authorization = route.request().headers().authorization;
    await new Promise(resolve => setTimeout(resolve, 100));
    await json(route, { success: true, data: null }, 202); return true;
  } });
  const response = await page.goto("/forgot-password");
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  await page.getByLabel("Email address").fill("unknown@example.test");
  await page.getByRole("button", { name: "Send reset instructions" }).dblclick();
  await expect(page.getByRole("heading", { name: "Request accepted" })).toBeVisible();
  await expect(page.getByText(/If an eligible account exists/)).toBeVisible();
  expect(calls).toBe(1);
  expect(authorization).toBeUndefined();
});

test("reset opens without a mutation, hides its token, and submits only once", async ({ page, context }) => {
  let calls = 0;
  let submitted: unknown;
  let authorization: string | undefined;
  let referer: string | undefined;
  await mockApi(context, { handle: async route => {
    if (!route.request().url().endsWith("/auth/reset-password")) return false;
    calls++; submitted = route.request().postDataJSON(); authorization = route.request().headers().authorization; referer = route.request().headers().referer;
    await new Promise(resolve => setTimeout(resolve, 100));
    await json(route, { success: true, data: null }); return true;
  } });
  const response = await page.goto("/reset-password?token=Synthetic-Reset-Link");
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(page).toHaveURL(/\/reset-password$/);
  expect(calls).toBe(0);
  await page.getByLabel("New password", { exact: true }).fill("  password-new  ");
  await page.getByLabel("Confirm new password", { exact: true }).fill("  password-new  ");
  await page.getByRole("button", { name: "Show new password", exact: true }).click();
  await expect(page.getByLabel("New password", { exact: true })).toHaveAttribute("type", "text");
  expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } })) ).not.toContain("Synthetic-Reset-Link");
  await page.getByRole("button", { name: "Reset password", exact: true }).dblclick();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("status")).toContainText("Your password has been reset");
  expect(calls).toBe(1);
  expect(submitted).toEqual({ token: "Synthetic-Reset-Link", newPassword: "  password-new  " });
  expect(authorization).toBeUndefined();
  expect(referer).toBeUndefined();
});

test("reload cannot silently recover or consume a scrubbed token", async ({ page, context }) => {
  await mockApi(context);
  await page.goto("/reset-password?token=Synthetic-Reset-Link");
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(/needs the complete reset link/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset password", exact: true })).toHaveCount(0);
});

test("Settings is available before account onboarding and revocation reaches another tab", async ({ page, context }) => {
  let calls = 0;
  const state = await mockApi(context, { active: true, handle: async route => {
    if (!route.request().url().endsWith("/auth/logout-all")) return false;
    calls++; expect(route.request().postData()).toBeNull();
    state.active = false;
    await json(route, { success: true, data: null }); return true;
  } });
  await page.goto("/settings");
  const second = await context.newPage();
  await second.goto("/settings");
  await expect(second.getByRole("heading", { name: "Password and sign-in access" })).toBeVisible();
  expect(state.accountReads).toBe(0);
  await page.getByRole("button", { name: "Sign out of all devices", exact: true }).click();
  expect(calls).toBe(0);
  await page.getByRole("button", { name: "Confirm sign out everywhere" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("status")).toContainText("signed out of all devices");
  await expect(second).toHaveURL(/\/login/);
  await expect(second.getByText("security@example.test", { exact: true })).toHaveCount(0);
  expect(calls).toBe(1);
  expect(state.refreshes).toBe(2);
});

test("unknown password-change outcome does not replay or claim success", async ({ page, context }) => {
  let calls = 0;
  await mockApi(context, { active: true, handle: async route => {
    if (!route.request().url().endsWith("/auth/change-password")) return false;
    calls++; await route.abort("failed"); return true;
  } });
  await page.goto("/settings");
  await page.getByLabel("Current password", { exact: true }).fill("old-password");
  await page.getByLabel("New password", { exact: true }).fill("new-password");
  await page.getByLabel("Confirm new password", { exact: true }).fill("new-password");
  await page.getByRole("button", { name: "Change password", exact: true }).click();
  await expect(page.getByText(/service did not confirm the outcome/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Change password", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Current password", { exact: true })).toHaveValue("");
  expect(calls).toBe(1);
});

for (const width of [390, 1024, 1440]) {
  test(`security layout and password controls remain usable at ${width}px`, async ({ page, context }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await mockApi(context, { active: true });
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Password and sign-in access" })).toBeVisible();
    await page.getByLabel("Current password", { exact: true }).fill("sample-password");
    await page.getByRole("button", { name: "Show current password" }).click();
    await expect(page.getByLabel("Current password", { exact: true })).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Hide current password" }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `test-results/account-security-settings-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}

test("recovery reflows at 200 percent zoom with keyboard access and reduced motion", async ({ page, context }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockApi(context);
  await page.goto("/reset-password?token=Synthetic-Zoom-Link");
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  await page.getByLabel("New password", { exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Show new password", exact: true })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByLabel("New password", { exact: true })).toHaveAttribute("type", "text");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/account-security-reset-zoom.png", fullPage: true });
});
