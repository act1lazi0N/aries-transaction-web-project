import { expect, test, type Page, type Route } from "@playwright/test";

const sourceAccount = {
  id: "source-1", userId: "user-1", accountNumber: "111122223333", accountType: "PERSONAL", balance: "500000.00", currency: "VND", status: "ACTIVE", createdAt: "2026-08-01T00:00:00Z", description: null,
};
const destinationAccount = {
  id: "destination-2", userId: "user-1", accountNumber: "444455556666", accountType: "PERSONAL", balance: "250000.00", currency: "VND", status: "ACTIVE", createdAt: "2026-08-01T00:00:00Z", description: null,
};

test("external transfer creates a backend-masked preview with one source account", async ({ page }) => {
  const calls = await mockTransferApi(page, [sourceAccount]);
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/transfers?mode=external", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Source account").selectOption("source-1");
  await page.getByLabel("Recipient account number").fill("000011117777");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("textbox", { name: /^Amount/ }).fill("1000.00");
  await page.getByRole("button", { name: "Review transfer" }).click();

  await expect(page.getByRole("heading", { name: "Review before sending" })).toBeVisible();
  await expect(page.getByText("******7777")).toBeVisible();
  await expect(page.getByText("Verified recipient")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm and send" })).toBeEnabled();
  expect(calls.preview).toEqual([{
    mode: "EXTERNAL", sourceAccountId: "source-1", recipientAccountNumber: "000011117777", amount: "1000.00", currency: "VND",
  }]);
  expect(JSON.stringify(calls.preview[0])).not.toContain("toAccountId");
  expect(calls.execute).toEqual([]);
  expect(runtimeErrors).toEqual([]);
});

test("own-account transfer uses owned destination and preview-backed execute", async ({ page }) => {
  const calls = await mockTransferApi(page, [sourceAccount, destinationAccount]);
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/transfers?mode=own-accounts", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /Between my accounts/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Source account").selectOption("source-1");
  await page.getByLabel("Destination account").selectOption("destination-2");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("textbox", { name: /^Amount/ }).fill("2500.00");
  await page.getByRole("button", { name: "Review transfer" }).click();
  await page.getByRole("button", { name: "Confirm and send" }).click();

  await expect(page.getByRole("heading", { name: "Transfer completed" })).toBeVisible();
  await expect(page).toHaveURL(/mode=own-accounts.*accountId=source-1.*transactionId=transaction-1/);
  expect(calls.preview).toEqual([{
    mode: "OWN_ACCOUNTS", sourceAccountId: "source-1", toAccountId: "destination-2", amount: "2500.00", currency: "VND",
  }]);
  expect(JSON.stringify(calls.preview[0])).not.toContain("recipientAccountNumber");
  expect(calls.execute).toHaveLength(1);
  expect(Object.keys(calls.execute[0]).sort()).toEqual(["idempotencyKey", "previewId"]);
  expect(calls.execute[0]).toMatchObject({ previewId: "preview-123" });
  expect(runtimeErrors).toEqual([]);
});

test("narrow keyboard flow preserves the decision path and announces review", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const calls = await mockTransferApi(page, [sourceAccount]);
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/transfers?mode=external", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Next", exact: true }).focus();
  await page.keyboard.press("Enter");
  const source = page.getByLabel("Source account");
  await source.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.getByLabel("Recipient account number").focus();
  await page.keyboard.type("000011117777");
  await page.getByRole("button", { name: "Next", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("textbox", { name: /^Amount/ }).focus();
  await page.keyboard.type("1000.00");
  await page.getByRole("button", { name: "Review transfer" }).focus();
  await page.keyboard.press("Enter");

  const review = page.getByRole("region", { name: "Review before sending" });
  await expect(review).toBeFocused();
  await expect(review).toHaveAttribute("aria-live", "polite");
  await expect(page.getByRole("button", { name: "Review transfer" })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const formBox = await page.locator("form").boundingBox();
  const reviewBox = await review.boundingBox();
  expect(formBox).not.toBeNull();
  expect(reviewBox).not.toBeNull();
  expect(reviewBox!.y).toBeGreaterThan(formBox!.y + formBox!.height);
  expect(calls.execute).toEqual([]);
  expect(runtimeErrors).toEqual([]);
});

async function mockTransferApi(page: Page, accounts: (typeof sourceAccount)[]) {
  const calls = { preview: [] as Record<string, unknown>[], execute: [] as Record<string, unknown>[] };
  await page.route("**/api/v1/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders() });
      return;
    }
    if (url.pathname === "/api/v1/auth/refresh") {
      await fulfillJson(route, ok({
        accessToken: "browser-access-token", tokenType: "Bearer", expiresIn: 900,
        user: { id: "user-1", fullName: "Browser User", email: "browser@example.com", role: "USER", isActive: true, emailVerified: false, createdAt: "2026-08-01T00:00:00Z" },
      }));
      return;
    }
    if (url.pathname === "/api/v1/notifications/unread-count") {
      await fulfillJson(route, ok({ unreadCount: 0 }));
      return;
    }
    if (url.pathname === "/api/v1/accounts") {
      await fulfillJson(route, ok(accounts));
      return;
    }
    if (url.pathname === "/api/v1/transfers/preview") {
      calls.preview.push(request.postDataJSON() as Record<string, unknown>);
      await fulfillJson(route, ok({
        previewId: "preview-123",
        expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
        source: { accountNumberMasked: "******3333", displayName: "Personal account" },
        recipient: { accountNumberMasked: "******7777", displayName: "Verified recipient" },
        amount: String(calls.preview.at(-1)?.amount ?? "1000.00"),
        fee: "10.00",
        debitTotal: calls.preview.at(-1)?.amount === "2500.00" ? "2510.00" : "1010.00",
        currency: "VND",
        warnings: [],
      }));
      return;
    }
    if (url.pathname === "/api/v1/transfers" && request.method() === "POST") {
      calls.execute.push(request.postDataJSON() as Record<string, unknown>);
      await fulfillJson(route, ok(transaction()));
      return;
    }
    if (url.pathname === "/api/v1/transfers/transaction-1") {
      await fulfillJson(route, ok(transaction()));
      return;
    }
    await fulfillJson(route, { status: 404, message: "Not found", code: "NOT_FOUND", requestId: "request-not-found" }, 404);
  });
  return calls;
}

function transaction() {
  return {
    id: "transaction-1", fromAccountId: "source-1", toAccountId: "destination-2", amount: "2500.00", currency: "VND", status: "COMPLETED",
    idempotencyKey: "browser-idempotency-key", description: null, failureReason: null, originalTransactionId: null, refundedAmount: "0",
    createdAt: "2026-08-28T08:00:00Z", completedAt: "2026-08-28T08:00:01Z",
    fromParty: { accountNumberDisplay: "111122223333", exposure: "FULL_OWNED", displayName: "Personal account", ownedByRequester: true },
    toParty: { accountNumberDisplay: "444455556666", exposure: "FULL_OWNED", displayName: "Savings account", ownedByRequester: true },
    direction: "OWN_ACCOUNTS",
  };
}

function ok(data: unknown) {
  return { success: true, message: "OK", data, timestamp: new Date().toISOString() };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", headers: corsHeaders(), body: JSON.stringify(body) });
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
