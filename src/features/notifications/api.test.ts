import { afterEach, describe, expect, it, vi } from "vitest";
import { confirmEmailVerification, getEmailDeliveries, getNotifications, redriveEmailDelivery, updateNotificationPreferences } from "@/features/notifications/api";
import type { AuthRequest } from "@/features/auth/request-types";

function requestWith(value: unknown) {
  return vi.fn().mockResolvedValue(value) as unknown as AuthRequest;
}

const page = (content: unknown[]) => ({ content, page: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0, first: true, last: true });

const transactionNotification = {
  id: "notification-1",
  type: "TRANSFER_COMPLETED",
  title: "Transfer completed",
  message: "Transfer completed safely.",
  data: {
    transactionId: "transaction-1",
    originalTransactionId: null,
    operation: "TRANSFER",
    amount: "1234567890123456.78",
    currency: "USD",
    direction: "OUTGOING",
    fromAccountDisplay: "********1111",
    toAccountDisplay: "********2222",
    occurredAt: "2026-09-05T10:00:00Z",
    email: "must-not-be-projected@example.com",
  },
  occurredAt: "2026-09-05T10:00:00Z",
  readAt: null,
  createdAt: "2026-09-05T10:00:01Z",
};

const deadLetteredDelivery = {
  id: "delivery-1",
  purpose: "TRANSACTION_NOTIFICATION",
  status: "DEAD_LETTERED",
  attemptCount: 5,
  cycleAttemptCount: 5,
  redriveCount: 1,
  lastErrorCode: "SMTP_TIMEOUT",
  nextAttemptAt: null,
  deliveredAt: null,
  createdAt: "2026-09-05T10:00:00Z",
  updatedAt: "2026-09-05T10:10:00Z",
};

afterEach(() => vi.unstubAllGlobals());

describe("notification API contracts", () => {
  it.each(["PASSWORD_RESET", "PASSWORD_CHANGED"])("accepts security email purpose %s", async purpose => {
    const result = await getEmailDeliveries({ status: "DEAD_LETTERED", page: 0, size: 20 }, requestWith(page([{ ...deadLetteredDelivery, purpose }])));
    expect(result.content[0].purpose).toBe(purpose);
  });
  it("keeps exact transaction amounts and projects only typed safe details", async () => {
    const result = await getNotifications({ status: "ALL", page: 0, size: 20 }, requestWith(page([transactionNotification])));
    expect(result.content[0].data).toMatchObject({ kind: "transaction", amount: "1234567890123456.78", fromAccountDisplay: "********1111" });
    expect(result.content[0].data).not.toHaveProperty("email");
  });

  it("keeps a valid core record when optional details are malformed", async () => {
    const malformed = { ...transactionNotification, data: { ...transactionNotification.data, amount: 100.25 } };
    const result = await getNotifications({ status: "ALL", page: 0, size: 20 }, requestWith(page([malformed])));
    expect(result.content[0]).toMatchObject({ id: "notification-1", title: "Transfer completed", data: null });
  });

  it("sends the complete preference state with its optimistic version", async () => {
    const request = requestWith({ transactionEmailEnabled: false, webhookAlertEmailEnabled: true, emailVerified: true, version: 8 });
    await updateNotificationPreferences({ transactionEmailEnabled: false, webhookAlertEmailEnabled: true, expectedVersion: 7 }, request);
    expect(request).toHaveBeenCalledWith("/api/v1/notifications/preferences", expect.objectContaining({ method: "PUT", body: JSON.stringify({ transactionEmailEnabled: false, webhookAlertEmailEnabled: true, expectedVersion: 7 }) }));
  });

  it("parses delivery evidence and submits redrive without an automatic replay flag", async () => {
    const listRequest = requestWith(page([deadLetteredDelivery]));
    const result = await getEmailDeliveries({ status: "DEAD_LETTERED", page: 0, size: 20 }, listRequest);
    expect(result.content[0]).toMatchObject({ id: "delivery-1", status: "DEAD_LETTERED", attemptCount: 5, lastErrorCode: "SMTP_TIMEOUT" });

    const redriveRequest = requestWith({ ...deadLetteredDelivery, status: "PENDING", cycleAttemptCount: 0, redriveCount: 2, lastErrorCode: null, nextAttemptAt: "2026-09-05T10:11:00Z" });
    await redriveEmailDelivery("delivery-1", redriveRequest);
    expect(redriveRequest).toHaveBeenCalledWith("/api/v1/operations/notification-email-deliveries/delivery-1/retry", { method: "POST" });
  });

  it("confirms a public token exactly through the public POST contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, message: "Email verified", data: { emailVerified: true } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(confirmEmailVerification("token-value")).resolves.toEqual({ emailVerified: true });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/v1/auth/email-verification/confirm", expect.objectContaining({ method: "POST", body: JSON.stringify({ token: "token-value" }) }));
  });
});
