import { expect, test, type Page, type Route } from "@playwright/test";

const createdAccount = {
  id: "account-1", userId: "user-1", accountNumber: "100000000001", accountType: "PERSONAL", balance: "0", currency: "VND", status: "ACTIVE", createdAt: "2026-08-29T08:00:00Z", description: "Daily",
};

test("first-account onboarding blocks direct financial navigation and submits once", async ({ page }) => {
  const calls: Record<string, unknown>[] = [];
  let accounts: typeof createdAccount[] = [];
  const runtimeErrors = collectRuntimeErrors(page);
  await mockApi(page, async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/v1/accounts" && request.method() === "GET") return fulfillJson(route, ok(accounts));
    if (path === "/api/v1/accounts" && request.method() === "POST") {
      calls.push(request.postDataJSON() as Record<string, unknown>);
      await new Promise(resolve => setTimeout(resolve, 75));
      accounts = [createdAccount];
      return fulfillJson(route, ok(createdAccount));
    }
    if (path === "/api/v1/transfers/account/account-1") return fulfillJson(route, ok(emptyTransactionPage()));
    return notFound(route);
  });

  await page.goto("/transactions?page=0&size=20&sort=createdAt%2Cdesc", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Create your first financial account" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create your first financial account" })).toBeFocused();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await page.locator("label").filter({ hasText: "Personal" }).click();
  await page.getByLabel(/Description/).fill("Daily");
  await page.getByRole("button", { name: "Review account" }).click();
  await page.getByRole("button", { name: "Create financial account" }).dblclick();

  await expect(page.getByRole("heading", { name: "Financial account created" })).toBeVisible();
  expect(calls).toHaveLength(1);
  expect(Object.keys(calls[0] ?? {}).sort()).toEqual(["accountType", "currency", "description", "idempotencyKey"]);
  expect(calls[0]).toMatchObject({ accountType: "PERSONAL", currency: "VND", description: "Daily" });
  await page.getByRole("button", { name: "Continue to workspace" }).click();
  await expect(page).toHaveURL(/\/overview\?accountId=account-1/);
  await expect(page.getByRole("heading", { name: "A clear view of what needs attention." })).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("unknown account result replays the same idempotency key", async ({ page }) => {
  const calls: Record<string, unknown>[] = [];
  let attempts = 0;
  await mockApi(page, async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/v1/accounts" && request.method() === "GET") return fulfillJson(route, ok([]));
    if (path === "/api/v1/accounts" && request.method() === "POST") {
      calls.push(request.postDataJSON() as Record<string, unknown>);
      attempts += 1;
      if (attempts === 1) return fulfillJson(route, { message: "Unavailable", code: "SERVICE_UNAVAILABLE", requestId: "request-1" }, 503);
      return fulfillJson(route, ok(createdAccount));
    }
    return notFound(route);
  });

  await page.goto("/overview", { waitUntil: "domcontentloaded" });
  await page.locator("label").filter({ hasText: "Personal" }).click();
  await page.getByRole("button", { name: "Review account" }).click();
  await page.getByRole("button", { name: "Create financial account" }).click();
  await expect(page.getByRole("heading", { name: "Account creation status unavailable" })).toBeVisible();
  await expect(page.getByText(/request-1/)).toBeVisible();
  await page.getByRole("button", { name: "Retry same request" }).click();
  await expect(page.getByRole("heading", { name: "Financial account created" })).toBeVisible();
  expect(calls).toHaveLength(2);
  expect(calls[1]?.idempotencyKey).toBe(calls[0]?.idempotencyKey);
});

test("transaction reads show backend-safe parties and never customer-facing UUIDs", async ({ page }) => {
  const transaction = {
    id: "transaction-1", fromAccountId: "owned-account-uuid", toAccountId: "foreign-account-uuid", amount: "1000.00", currency: "VND", status: "COMPLETED", idempotencyKey: "key-1", description: null, failureReason: null, originalTransactionId: null, refundedAmount: null, createdAt: "2026-08-29T08:00:00Z", completedAt: "2026-08-29T08:00:01Z",
    fromParty: { accountNumberDisplay: "100000000001", exposure: "FULL_OWNED", displayName: "Daily account", ownedByRequester: true },
    toParty: { accountNumberDisplay: "******7788", exposure: "MASKED_COUNTERPARTY", displayName: "Verified recipient", ownedByRequester: false },
    direction: "OUTGOING",
  };
  await mockApi(page, async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/accounts") return fulfillJson(route, ok([createdAccount]));
    if (path === "/api/v1/transfers/account/account-1") return fulfillJson(route, ok({ content: [transaction], number: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true, empty: false }));
    if (path === "/api/v1/transfers/transaction-1") return fulfillJson(route, ok(transaction));
    return notFound(route);
  });

  await page.goto("/transactions?accountId=account-1&transactionId=transaction-1&page=0&size=20&sort=createdAt%2Cdesc", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Outgoing").first()).toBeVisible();
  await expect(page.getByText("Verified recipient").first()).toBeVisible();
  await expect(page.getByText("******7788").first()).toBeVisible();
  const detail = page.locator("section[aria-labelledby='transaction-detail-title']");
  await expect(detail.getByText("100000000001", { exact: true })).toBeVisible();
  await expect(detail.getByRole("button", { name: "Copy owned account number" })).toBeVisible();
  expect(await page.getByText("owned-account-uuid", { exact: true }).count()).toBe(0);
  expect(await page.getByText("foreign-account-uuid", { exact: true }).count()).toBe(0);
});

test("narrow keyboard onboarding keeps the decision path and focus order", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page, async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/accounts") return fulfillJson(route, ok([]));
    return notFound(route);
  });

  await page.goto("/overview", { waitUntil: "domcontentloaded" });
  const personal = page.getByRole("radio", { name: /Personal/ });
  await personal.focus();
  await page.keyboard.press("Space");
  await expect(personal).toBeChecked();
  await page.getByRole("button", { name: "Review account" }).focus();
  await page.keyboard.press("Enter");

  const status = page.getByRole("region", { name: "Review before creating" });
  await expect(status).toBeFocused();
  await expect(page.getByRole("button", { name: "Create financial account" })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const formBox = await page.locator("form").boundingBox();
  const statusBox = await status.boundingBox();
  expect(formBox).not.toBeNull();
  expect(statusBox).not.toBeNull();
  expect(statusBox!.y).toBeGreaterThan(formBox!.y + formBox!.height);
});

test("first-account onboarding blocks Settings and every workspace escape except sign out", async ({ page }) => {
  await mockApi(page, async route => {
    if (new URL(route.request().url()).pathname === "/api/v1/accounts") return fulfillJson(route, ok([]));
    return notFound(route);
  });
  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Create your first financial account" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Profile and access" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

for (const role of ["USER", "MERCHANT"] as const) {
  test(`${role} sees only customer navigation and cannot open Controls`, async ({ page }) => {
    let operationalCalls = 0;
    await mockApi(page, async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/v1/accounts") return fulfillJson(route, ok([createdAccount]));
      if (path === "/api/v1/transfers/account/account-1") return fulfillJson(route, ok(emptyTransactionPage()));
      if (path.startsWith("/api/v1/reconciliation")) operationalCalls += 1;
      return notFound(route);
    }, role);

    await page.goto("/overview?accountId=account-1", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link")).toHaveText([
      role === "MERCHANT" ? "Merchant Overview" : "Overview",
      "Transfers",
      "Transactions",
      "Accounts",
      "Settings",
    ]);
    await page.goto("/controls", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/overview(?:\?accountId=account-1)?$/);
    await expect(page.getByRole("heading", { name: "Operational controls" })).toHaveCount(0);
    expect(operationalCalls).toBe(0);
  });
}

for (const role of ["OPERATOR", "ADMIN"] as const) {
  test(`${role} sees only operational navigation and redirects customer routes`, async ({ page }) => {
    await mockApi(page, async route => {
      if (new URL(route.request().url()).pathname === "/api/v1/operations/overview") {
        return fulfillJson(route, ok({
          range: "24h",
          generatedAt: "2026-09-01T00:00:00Z",
          customers: { users: 4, merchants: 2, active: 5, suspended: 1 },
          transactions: { total: 8, pending: 1, failed: 0 },
          reconciliation: { runs: 3, exceptions: 0 },
          settlements: { batches: 2, pending: 1, failed: 0 },
          ledger: { entries: 16, journals: 8, unbalancedJournals: 0, healthy: true },
        }));
      }
      return notFound(route);
    }, role);
    await page.goto("/transfers", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/operations$/);
    await expect(page.getByRole("heading", { name: "System health, without invented certainty." })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link")).toHaveText(["Operations", "Email deliveries", "Customers", "Transactions", "Ledger", "Controls", "Settlements", "Settings"]);
    await expect(page.getByRole("heading", { name: "Send a transfer" })).toHaveCount(0);
  });
}

async function mockApi(page: Page, handler: (route: Route) => Promise<unknown>, role = "USER") {
  await page.route("**/api/v1/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: corsHeaders() });
    if (path === "/api/v1/auth/refresh") return fulfillJson(route, ok({ accessToken: "browser-access-token", tokenType: "Bearer", expiresIn: 900, user: { id: "user-1", fullName: "Browser User", email: "browser@example.com", role, isActive: true, emailVerified: false, createdAt: "2026-08-01T00:00:00Z" } }));
    if (path === "/api/v1/notifications/unread-count") return fulfillJson(route, ok({ unreadCount: 0 }));
    await handler(route);
  });
}

function emptyTransactionPage() {
  return { content: [], number: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true, empty: true };
}

function ok(data: unknown) {
  return { success: true, message: "OK", data, timestamp: new Date().toISOString() };
}

async function notFound(route: Route) {
  return fulfillJson(route, { message: "Not found", code: "NOT_FOUND", requestId: "request-not-found" }, 404);
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", headers: corsHeaders(), body: JSON.stringify(body) });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "http://localhost:3000",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}
