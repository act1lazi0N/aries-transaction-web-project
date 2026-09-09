import { expect, test } from "@playwright/test";

test("login explains confirmed suspension without suggesting incorrect credentials", async ({ page }) => {
  let loginCalls = 0;
  await page.route("**/api/v1/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const headers = {
      "Access-Control-Allow-Origin": "http://localhost:3000",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    };
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (path === "/api/v1/auth/login") {
      loginCalls += 1;
      return route.fulfill({ status: 403, headers, contentType: "application/json", body: JSON.stringify({
        status: 403, code: "ACCOUNT_SUSPENDED", message: "Your account is suspended. Contact support for help.",
      }) });
    }
    return route.fulfill({ status: 401, headers, contentType: "application/json", body: JSON.stringify({ code: "UNAUTHORIZED" }) });
  });
  await page.goto("/login");
  await page.getByLabel("Work email").fill("suspended@example.com");
  await page.getByLabel("Password", { exact: true }).fill("test-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Your account is suspended." })).toHaveText("Your account is suspended. Contact support for help.");
  await expect(page.getByText(/email or password is incorrect/)).toHaveCount(0);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Work email")).toHaveValue("suspended@example.com");
  expect(loginCalls).toBe(1);
});
