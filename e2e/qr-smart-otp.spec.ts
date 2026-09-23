import { expect, test, type Page } from "@playwright/test";
import QRCode from "qrcode";

const qrId = "11111111-1111-4111-8111-111111111111";
const authorizationId = "22222222-2222-4222-8222-222222222222";
const payload = `aries:pay:v1:${qrId}`;
const account = { id: "source-1", userId: "user-1", accountNumber: "111122223333", accountType: "PERSONAL", balance: "500000.00", currency: "VND", status: "ACTIVE", createdAt: "2026-08-01T00:00:00Z", description: null };
const recipient = { accountNumberMasked: "******7777", displayName: "Verified recipient" };

async function mockApi(page: Page, options: { otp?: boolean; loseExecute?: boolean; loseVerify?: boolean; loseCreate?: boolean; frozen?: boolean; qrFailure?: string; rejectReplay?: boolean; accountQr?: boolean } = {}) {
  const calls = { previews: [] as Record<string, unknown>[], executes: [] as Record<string, unknown>[], authorizations: [] as Record<string, unknown>[], verifications: [] as Record<string, unknown>[], creations: [] as { body: unknown; key: string | undefined }[], reads: 0 };
  let state = "PENDING"; let codes: Record<string, unknown>[] = [];
  const expiry = new Date(Date.now() + 120_000).toISOString();
  const code = { id: qrId, payload, type: "PAYMENT_REQUEST", state: "ACTIVE", amount: "1500.00", currency: "VND", description: "Lunch", createdAt: new Date().toISOString(), expiresAt: expiry, transactionId: null };
  const challenge = () => ({ id: authorizationId, deviceId: "device", purpose: "TRANSFER", suite: "OCRA-1:HOTP-SHA256-8:QH64", payloadBase64: "not-needed-on-web", state, expiresAt: expiry });
  const transaction = { id: "transaction-1", fromAccountId: "source-1", toAccountId: "recipient-2", amount: "1500.00", currency: "VND", status: "COMPLETED", idempotencyKey: "stable-key-12345678", description: "Lunch", failureReason: null, originalTransactionId: null, refundedAmount: "0", createdAt: new Date().toISOString(), completedAt: new Date().toISOString(), fromParty: { accountNumberDisplay: "111122223333", exposure: "FULL_OWNED", displayName: "Mine", ownedByRequester: true }, toParty: { accountNumberDisplay: "******7777", exposure: "MASKED_EXTERNAL", displayName: "Verified recipient", ownedByRequester: false }, direction: "OUTGOING" };
  await page.route("**/api/v1/**", async route => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname;
    const headers = { "Access-Control-Allow-Origin": "http://localhost:3000", "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
    const reply = (data: unknown) => route.fulfill({ status: 200, contentType: "application/json", headers, body: JSON.stringify({ success: true, data, message: "OK" }) });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (path === "/api/v1/auth/refresh") return reply({ accessToken: "browser-access-token", tokenType: "Bearer", expiresIn: 900, user: { id: "user-1", fullName: "Browser User", email: "browser@example.com", role: "USER", isActive: true, emailVerified: true, createdAt: "2026-08-01T00:00:00Z" } });
    if (path === "/api/v1/notifications/unread-count") return reply({ unreadCount: 0 });
    if (path === "/api/v1/notifications/preferences") return reply({ transactionEmailEnabled: true, webhookAlertEmailEnabled: false, emailVerified: true, version: 0 });
    if (path === "/api/v1/accounts") return reply([{ ...account, status: options.frozen ? "FROZEN" : "ACTIVE" }]);
    if (path === "/api/v1/accounts/source-1/qr-codes") {
      if (request.method() === "GET") return reply({ content: codes, totalPages: codes.length ? 1 : 0, number: 0 });
      calls.creations.push({ body: request.postDataJSON(), key: request.headers()["idempotency-key"] });
      const body = request.postDataJSON(); codes = [{ ...code, type: body.type, amount: body.type === "ACCOUNT" ? null : body.amount, description: body.type === "ACCOUNT" ? null : body.description ?? null, expiresAt: body.type === "ACCOUNT" ? null : expiry }];
      if (options.loseCreate && calls.creations.length === 1) return route.abort("failed");
      return reply(codes[0]);
    }
    if (path === `/api/v1/qr-codes/${qrId}/revoke`) { codes = codes.map(qr => ({ ...qr, state: "REVOKED" })); return reply(codes[0]); }
    if (path === "/api/v1/qr-codes/resolve") {
      if (options.qrFailure) return route.fulfill({ status: 409, headers, contentType: "application/json", body: JSON.stringify({ code: options.qrFailure, message: "QR unavailable" }) });
      return reply({ qrCodeId: qrId, type: options.accountQr ? "ACCOUNT" : "PAYMENT_REQUEST", recipient, amount: options.accountQr ? null : "1500.00", currency: "VND", description: options.accountQr ? null : "Lunch", expiresAt: options.accountQr ? null : expiry });
    }
    if (path === "/api/v1/transfers/preview") { calls.previews.push(request.postDataJSON()); return reply({ previewId: "preview-123", expiresAt: expiry, source: { accountNumberMasked: "******3333", displayName: "Mine" }, recipient, amount: "1500.00", fee: "0.00", debitTotal: "1500.00", currency: "VND", warnings: [], authorizationRequirement: options.otp ? "SMART_OTP" : "NONE", enrollmentState: options.otp ? "ACTIVE" : "UNAVAILABLE" }); }
    if (path === "/api/v1/transfers/authorizations") { calls.authorizations.push(request.postDataJSON()); return reply(challenge()); }
    if (path === `/api/v1/transfers/authorizations/${authorizationId}`) { calls.reads++; return reply(challenge()); }
    if (path === `/api/v1/transfers/authorizations/${authorizationId}/verify`) { calls.verifications.push(request.postDataJSON()); state = "VERIFIED"; if (options.loseVerify && calls.verifications.length === 1) return route.abort("failed"); return reply(challenge()); }
    if (path === "/api/v1/transfers") { calls.executes.push(request.postDataJSON()); if (options.rejectReplay && calls.executes.length > 1) return route.fulfill({ status: 409, headers, contentType: "application/json", body: JSON.stringify({ code: "TRANSFER_PREVIEW_UNAVAILABLE", message: "Unavailable" }) }); state = "CONSUMED"; if (options.loseExecute && calls.executes.length === 1) return route.abort("failed"); return reply(transaction); }
    if (path === "/api/v1/transfers/transaction-1") return reply(transaction);
    if (path === "/api/v1/auth/smart-otp/status") return reply({ mode: "ENFORCED", enrollmentState: "ACTIVE", deviceId: "device" });
    return route.fulfill({ status: 404, headers, body: "Not found" });
  });
  return { calls, setCodes: (value: Record<string, unknown>[]) => { codes = value; }, code };
}
async function reviewQr(page: Page, image = false) {
  await page.goto("/transfers?view=pay-qr");
  if (image) await page.getByLabel("Upload QR image").setInputFiles({ name: "payment.png", mimeType: "image/png", buffer: await QRCode.toBuffer(payload) });
  else { await page.getByLabel("Paste payment QR contents").fill(payload); await page.getByRole("button", { name: "Read payment QR" }).click(); }
  await page.getByLabel("Source account").selectOption("source-1");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /^Amount/ })).toHaveAttribute("readonly", "");
  await expect(page.getByLabel("Description")).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "Review transfer" }).click();
}
async function verify(page: Page) {
  await page.getByRole("button", { name: "Continue to Smart OTP" }).click();
  await expect(page.getByRole("img", { name: "Scan in Aries to review this transfer" })).toBeVisible();
  await page.getByLabel("Eight-digit Smart OTP").fill("00123456");
  await page.getByRole("button", { name: "Verify and transfer" }).click();
}

test("uploaded QR uses fixed values and recovers uncertain OTP-bound execution after reload", async ({ page }) => {
  const { calls } = await mockApi(page, { otp: true, loseExecute: true });
  await reviewQr(page, true); expect(calls.previews).toEqual([{ sourceAccountId: "source-1", qrCodeId: qrId }]);
  await verify(page); await expect(page.getByRole("heading", { name: "Transfer status unavailable" })).toBeVisible();
  const saved = await page.evaluate(() => sessionStorage.getItem("aries.transfer-recovery.v1"));
  expect(JSON.parse(saved!)).toEqual({ version: 1, userId: "user-1", ...calls.executes[0] }); expect(saved).not.toContain("00123456");
  await page.reload(); await expect(page.getByRole("heading", { name: "Check your unfinished transfer" })).toBeVisible();
  expect(calls.executes).toHaveLength(1); await page.getByRole("button", { name: "Check safely" }).click();
  await expect(page.getByRole("heading", { name: "Transfer completed" })).toBeVisible();
  expect(calls.executes).toHaveLength(2); expect(calls.executes[0]).toEqual(calls.executes[1]);
  expect(calls.executes[0]).toEqual({ ...calls.authorizations[0], authorizationId });
  expect(calls.verifications).toEqual([{ otp: "00123456" }]); expect(await page.evaluate(() => sessionStorage.getItem("aries.transfer-recovery.v1"))).toBeNull();
});

test("uncertain verification is read before explicit continuation", async ({ page }) => {
  const { calls } = await mockApi(page, { otp: true, loseVerify: true });
  await reviewQr(page); await verify(page); expect(calls.executes).toHaveLength(0);
  await page.getByRole("button", { name: "Check verification status" }).click();
  await expect(page.getByRole("button", { name: "Continue verified transfer" })).toBeVisible(); expect(calls.executes).toHaveLength(0);
  await page.getByRole("button", { name: "Continue verified transfer" }).click(); await expect(page.getByRole("heading", { name: "Transfer completed" })).toBeVisible();
  expect(calls.verifications).toHaveLength(1); expect(calls.reads).toBe(1);
});

test("receiving QR retries one creation, renders a downloadable image and revokes", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", error => runtimeErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error" && !message.text().includes("net::ERR_FAILED")) runtimeErrors.push(message.text()); });
  const { calls } = await mockApi(page, { loseCreate: true });
  await page.goto("/transfers?view=receive"); await page.getByLabel("Receiving account").selectOption("source-1");
  await page.getByLabel("QR type").selectOption("PAYMENT_REQUEST"); await page.getByLabel("Request amount (VND)").fill("1500.00"); await page.getByLabel("Request description").fill("Lunch");
  await page.getByRole("button", { name: "Create QR", exact: true }).click(); await page.getByRole("button", { name: "Retry same QR request" }).click();
  await expect(page.getByRole("img", { name: "Aries payment QR" })).toBeVisible(); expect(calls.creations).toHaveLength(2); expect(calls.creations[0]).toEqual(calls.creations[1]);
  const downloaded = page.waitForEvent("download"); await page.getByRole("button", { name: "Download PNG" }).click(); expect((await downloaded).suggestedFilename()).toBe("aries-payment-qr.png");
  await page.screenshot({ path: "test-results/qr-receive-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Revoke QR", exact: true }).click(); await page.getByRole("button", { name: "Confirm revoke QR" }).click();
  await expect(page.getByRole("heading", { name: "Payment request · REVOKED" })).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("camera denial preserves upload and paste fallback, and paid requests cannot preview", async ({ page }) => {
  const { calls } = await mockApi(page, { qrFailure: "QR_PAID" });
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException("Denied", "NotAllowedError"); }; });
  await page.goto("/transfers?view=pay-qr"); await page.getByRole("button", { name: "Use camera" }).click();
  await expect(page.getByText(/Camera access is unavailable/)).toBeVisible(); await page.getByLabel("Paste payment QR contents").fill(payload); await page.getByRole("button", { name: "Read payment QR" }).click();
  await expect(page.getByText("This payment request has already been paid.")).toBeVisible(); expect(calls.previews).toEqual([]); expect(calls.executes).toEqual([]);
});

test("narrow keyboard QR flow does not require OTP when backend says NONE", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); const { calls } = await mockApi(page);
  const runtime: string[] = []; page.on("pageerror", error => runtime.push(error.message));
  await reviewQr(page); await expect(page.getByRole("button", { name: "Continue to Smart OTP" })).toHaveCount(0);
  await page.screenshot({ path: "test-results/qr-review-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Confirm and send" }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Transfer completed" })).toBeVisible(); expect(calls.authorizations).toEqual([]); expect(calls.executes).toHaveLength(1); expect(runtime).toEqual([]);
});

test("frozen receiving account can revoke existing codes but cannot create", async ({ page }) => {
  const api = await mockApi(page, { frozen: true }); api.setCodes([{ ...api.code }]);
  await page.goto("/transfers?view=receive&accountId=source-1"); await expect(page.getByRole("button", { name: "Create QR", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: /View QR/ }).click(); await page.getByRole("button", { name: "Revoke QR", exact: true }).click(); await page.getByRole("button", { name: "Confirm revoke QR" }).click();
  await expect(page.getByRole("heading", { name: "Payment request · REVOKED" })).toBeVisible(); expect(api.calls.creations).toEqual([]);
});

test("manual transfer also requires OTP when the backend requires it", async ({ page }) => {
  const { calls } = await mockApi(page, { otp: true });
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/transfers"); await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Source account").selectOption("source-1"); await page.getByLabel("Recipient account number").fill("000011117777");
  await page.getByRole("button", { name: "Next", exact: true }).click(); await page.getByRole("textbox", { name: /^Amount/ }).fill("1500.00");
  await page.getByRole("button", { name: "Review transfer" }).click(); await expect(page.getByRole("button", { name: "Confirm and send" })).toHaveCount(0);
  await page.getByRole("button", { name: "Continue to Smart OTP" }).click();
  await expect(page.getByLabel("Eight-digit Smart OTP")).toBeVisible();
  await page.screenshot({ path: "test-results/otp-review-desktop.png", fullPage: true });
  await page.getByLabel("Eight-digit Smart OTP").fill("00123456"); await page.getByRole("button", { name: "Verify and transfer" }).click();
  await expect(page.getByRole("heading", { name: "Transfer completed" })).toBeVisible(); expect(calls.executes[0].authorizationId).toBe(authorizationId); expect(errors).toEqual([]);
});

test("a rejected replay after reload cannot erase the original uncertain outcome", async ({ page }) => {
  const { calls } = await mockApi(page, { otp: true, loseExecute: true, rejectReplay: true });
  await reviewQr(page); await verify(page);
  await expect(page.getByRole("heading", { name: "Transfer status unavailable" })).toBeVisible();
  await page.reload(); await page.getByRole("button", { name: "Check safely" }).click();
  await expect(page.getByText(/The result is still unconfirmed/)).toBeVisible();
  expect(calls.executes).toHaveLength(2); expect(calls.executes[0]).toEqual(calls.executes[1]);
  expect(await page.evaluate(() => sessionStorage.getItem("aries.transfer-recovery.v1"))).not.toBeNull();
  await expect(page.getByRole("button", { name: "Return to transfers" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "View transaction history" })).toBeVisible();
});

test("Settings displays read-only Smart OTP device status", async ({ page }) => {
  await mockApi(page);
  await page.goto("/settings");
  const panel = page.getByRole("region", { name: "Smart OTP", exact: true });
  await expect(panel.getByText("Active device", { exact: true })).toBeVisible();
  await expect(panel.getByText("Required for transfers to another owner")).toBeVisible();
  await panel.getByRole("button", { name: "Refresh Smart OTP status" }).click();
  await expect(panel.getByText("Active device", { exact: true })).toBeVisible();
  await expect(panel.getByRole("button")).toHaveCount(1);
});

test("reusable account QR is created without fixed values and lets its payer enter an amount", async ({ page }) => {
  const { calls } = await mockApi(page, { accountQr: true });
  await page.goto("/transfers?view=receive&accountId=source-1");
  await page.getByRole("button", { name: "Create QR", exact: true }).click();
  await expect(page.getByRole("img", { name: "Aries payment QR" })).toBeVisible();
  expect(calls.creations[0].body).toEqual({ type: "ACCOUNT", currency: "VND" });
  await page.getByRole("button", { name: "Pay QR", exact: true }).click();
  await page.getByLabel("Paste payment QR contents").fill(payload); await page.getByRole("button", { name: "Read payment QR" }).click();
  await page.getByLabel("Source account").selectOption("source-1"); await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /^Amount/ })).toBeEditable();
  await page.getByRole("textbox", { name: /^Amount/ }).fill("1500.00"); await page.getByLabel("Description").fill("Lunch");
  await page.getByRole("button", { name: "Review transfer" }).click();
  expect(calls.previews).toEqual([{ sourceAccountId: "source-1", qrCodeId: qrId, amount: "1500.00", description: "Lunch" }]);
  await page.getByRole("button", { name: "Confirm and send" }).click(); await expect(page.getByRole("heading", { name: "Transfer completed" })).toBeVisible();
});
