import { expect, test, type Page, type Route } from "@playwright/test";

const account = { id: "account-1", userId: "user-1", accountNumber: "100000000001", accountType: "PERSONAL", balance: "0", currency: "USD", status: "ACTIVE", createdAt: "2026-09-01T00:00:00Z", description: "Daily" };
const notification = {
  id: "notification-1",
  type: "TRANSFER_COMPLETED",
  title: "Transfer completed",
  message: "Transfer completed: you sent 1234567890123456.78 USD using account ********1111.",
  data: { transactionId: "transaction-1", originalTransactionId: null, operation: "TRANSFER", amount: "1234567890123456.78", currency: "USD", direction: "OUTGOING", fromAccountDisplay: "********1111", toAccountDisplay: "********2222", occurredAt: "2026-09-05T10:00:00Z" },
  occurredAt: "2026-09-05T10:00:00Z",
  readAt: null as string | null,
  createdAt: "2026-09-05T10:00:01Z",
};
const transaction = {
  id: "transaction-1", fromAccountId: "source-1", toAccountId: "destination-1", amount: "1234567890123456.78", currency: "USD", status: "COMPLETED",
  idempotencyKey: "browser-idempotency-key", description: null, failureReason: null, originalTransactionId: null, refundedAmount: "0",
  createdAt: "2026-09-05T10:00:00Z", completedAt: "2026-09-05T10:00:01Z",
  fromParty: { accountNumberDisplay: "100000000001", exposure: "FULL_OWNED", displayName: "Daily", ownedByRequester: true },
  toParty: { accountNumberDisplay: "********2222", exposure: "MASKED_COUNTERPARTY", displayName: null, ownedByRequester: false },
  direction: "OUTGOING",
};

test("notification center preserves exact amounts and marks a record read once", async ({ page }) => {
  let markCalls = 0;
  await mockAuthenticatedApi(page, "USER", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/v1/accounts") return json(route, ok([account]));
    if (url.pathname === "/api/v1/notifications/unread-count") return json(route, ok({ unreadCount: notification.readAt ? 0 : 1 }));
    if (url.pathname === "/api/v1/notifications" && request.method() === "GET") return json(route, ok(pageOf([notification])));
    if (url.pathname === "/api/v1/transfers/transaction-1" && request.method() === "GET") return json(route, ok(transaction));
    if (url.pathname === "/api/v1/notifications/notification-1/read" && request.method() === "PATCH") {
      markCalls += 1;
      await new Promise(resolve => setTimeout(resolve, 75));
      notification.readAt = "2026-09-05T11:00:00Z";
      return json(route, ok(notification));
    }
    return notFound(route);
  });

  await page.goto("/notifications", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Updates that keep their meaning." })).toBeVisible();
  await expect(page.getByText(/1234567890123456\.78/).first()).toBeVisible();
  await expect(page.getByText("********1111 → ********2222")).toBeVisible();
  await page.getByRole("link", { name: "View transaction" }).click();
  await expect(page.getByRole("heading", { name: "Transaction details" })).toBeVisible();
  await expect(page.getByText(/1234567890123456\.78/).first()).toBeVisible();
  await page.goBack({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Mark as read" }).dblclick();
  await expect(page.getByText("The service confirmed the updated read state.")).toBeVisible();
  expect(markCalls).toBe(1);
  await page.getByRole("tab", { name: "Read", exact: true }).click();
  await expect(page).toHaveURL(/status=READ&page=0&size=20/);
});

test("merchant settings distinguish accepted verification from delivered email", async ({ page }) => {
  let savedBody: unknown;
  await mockAuthenticatedApi(page, "MERCHANT", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/v1/accounts") return json(route, ok([account]));
    if (url.pathname === "/api/v1/notifications/unread-count") return json(route, ok({ unreadCount: 0 }));
    if (url.pathname === "/api/v1/notifications/preferences" && request.method() === "GET") return json(route, ok({ transactionEmailEnabled: true, webhookAlertEmailEnabled: true, emailVerified: false, version: 4 }));
    if (url.pathname === "/api/v1/notifications/preferences" && request.method() === "PUT") {
      savedBody = request.postDataJSON();
      return json(route, ok({ transactionEmailEnabled: false, webhookAlertEmailEnabled: true, emailVerified: false, version: 5 }));
    }
    if (url.pathname === "/api/v1/auth/email-verification/request" && request.method() === "POST") return json(route, ok({ emailVerified: false }), 202);
    return notFound(route);
  });

  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("switch", { name: "Webhook alert email" })).toBeVisible();
  await page.getByRole("button", { name: "Send verification email" }).click();
  await expect(page.getByText("Verification request accepted")).toBeVisible();
  await expect(page.getByText(/Delivery is queued separately/i)).toBeVisible();
  await page.getByRole("switch", { name: "Transaction email" }).click();
  await page.getByRole("button", { name: "Save email preferences" }).click();
  await expect.poll(() => savedBody).toEqual({ transactionEmailEnabled: false, webhookAlertEmailEnabled: true, expectedVersion: 4 });
});

test("operator redrive remains queued and never claims delivery", async ({ page }) => {
  const delivery = { id: "delivery-1", purpose: "TRANSACTION_NOTIFICATION", status: "DEAD_LETTERED", attemptCount: 5, cycleAttemptCount: 5, redriveCount: 1, lastErrorCode: "SMTP_TIMEOUT", nextAttemptAt: null, deliveredAt: null, createdAt: "2026-09-05T10:00:00Z", updatedAt: "2026-09-05T10:10:00Z" };
  await mockAuthenticatedApi(page, "OPERATOR", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/v1/notifications/unread-count") return json(route, ok({ unreadCount: 0 }));
    if (url.pathname === "/api/v1/operations/notification-email-deliveries" && request.method() === "GET") return json(route, ok(pageOf([delivery])));
    if (url.pathname === "/api/v1/operations/notification-email-deliveries/delivery-1/retry" && request.method() === "POST") return json(route, ok({ ...delivery, status: "PENDING", cycleAttemptCount: 0, redriveCount: 2, lastErrorCode: null, nextAttemptAt: "2026-09-05T10:11:00Z" }), 202);
    return notFound(route);
  });

  await page.goto("/operations/notification-email-deliveries", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Email delivery recovery" })).toBeVisible();
  await page.getByRole("button", { name: "Redrive" }).click();
  await expect(page.getByText(/returned Pending/i)).toBeVisible();
  await expect(page.getByText(/Delivery itself is not yet confirmed/i)).toBeVisible();
  await expect(page.getByText(/Delivery confirmed/i)).toHaveCount(0);
});

test("public verification confirms one token once", async ({ page }) => {
  let confirms = 0;
  await page.route("**/api/v1/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors() });
    if (url.pathname === "/api/v1/auth/refresh") return json(route, { message: "Unauthorized", code: "UNAUTHORIZED" }, 401);
    if (url.pathname === "/api/v1/auth/email-verification/confirm") {
      confirms += 1;
      return json(route, ok({ emailVerified: true }));
    }
    return notFound(route);
  });

  await page.goto("/verify-email?token=one-time-token", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Your email is verified" })).toBeVisible();
  expect(confirms).toBe(1);
});

async function mockAuthenticatedApi(page: Page, role: "USER" | "MERCHANT" | "OPERATOR", handler: (route: Route) => Promise<unknown>) {
  await page.route("**/api/v1/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors() });
    if (url.pathname === "/api/v1/auth/refresh") return json(route, ok({ accessToken: "browser-access-token", tokenType: "Bearer", expiresIn: 900, user: { id: "user-1", fullName: "Browser User", email: "browser@example.com", role, isActive: true, emailVerified: false, createdAt: "2026-09-01T00:00:00Z" } }));
    await handler(route);
  });
}

function pageOf(content: unknown[]) {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0, first: true, last: true };
}

function ok(data: unknown) {
  return { success: true, message: "OK", data, timestamp: new Date().toISOString() };
}

async function notFound(route: Route) {
  return json(route, { message: "Not found", code: "NOT_FOUND", requestId: "request-not-found" }, 404);
}

async function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", headers: cors(), body: JSON.stringify(body) });
}

function cors() {
  return { "Access-Control-Allow-Origin": "http://localhost:3000", "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, OPTIONS" };
}
