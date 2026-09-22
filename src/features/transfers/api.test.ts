import { describe, expect, it, vi } from "vitest";
import type { AuthRequest } from "@/features/auth/request-types";
import { createTransferPreview, executeTransferPreview, parseTransferPreview, transferPath, transferPreviewPath } from "@/features/transfers/api";

const previewResponse = {
  previewId: "preview-123",
  expiresAt: "2026-08-28T15:05:00+07:00",
  source: { accountNumberMasked: "******1111", displayName: "Personal account" },
  recipient: { accountNumberMasked: "******2222", displayName: "Recipient" },
  amount: "1000.00",
  fee: "10.00",
  debitTotal: "1010.00",
  currency: "VND",
  warnings: [],
};

describe("transfer API", () => {
  it("sends an exclusive EXTERNAL preview payload", async () => {
    const request = vi.fn().mockResolvedValue(previewResponse) as unknown as AuthRequest;

    await createTransferPreview({
      mode: "EXTERNAL",
      sourceAccountId: "source-1",
      recipientAccountNumber: "001122334455",
      amount: "1000.00",
      currency: "VND",
    }, request);

    expect(transferPreviewPath()).toBe("/api/v1/transfers/preview");
    const [, options] = vi.mocked(request).mock.calls[0];
    expect(JSON.parse(String(options?.body))).toEqual({
      mode: "EXTERNAL",
      sourceAccountId: "source-1",
      recipientAccountNumber: "001122334455",
      amount: "1000.00",
      currency: "VND",
    });
    expect(String(options?.body)).not.toContain("toAccountId");
    expect(options).not.toHaveProperty("financialMutation");
  });

  it("sends an exclusive OWN_ACCOUNTS preview payload", async () => {
    const request = vi.fn().mockResolvedValue(previewResponse) as unknown as AuthRequest;

    await createTransferPreview({
      mode: "OWN_ACCOUNTS",
      sourceAccountId: "source-1",
      toAccountId: "destination-2",
      amount: "2500",
      currency: "VND",
    }, request);

    const [, options] = vi.mocked(request).mock.calls[0];
    expect(JSON.parse(String(options?.body))).toMatchObject({ mode: "OWN_ACCOUNTS", toAccountId: "destination-2" });
    expect(String(options?.body)).not.toContain("recipientAccountNumber");
  });

  it("executes only the returned preview with one idempotency key", async () => {
    const transaction = {
      id: "transaction-1", fromAccountId: "source-1", toAccountId: "destination-2", amount: "1000.00", currency: "VND",
      status: "COMPLETED", idempotencyKey: "stable-key-00000001", description: null, failureReason: null,
      originalTransactionId: null, refundedAmount: "0", createdAt: "2026-08-28T08:00:00Z", completedAt: "2026-08-28T08:00:01Z",
    };
    const request = vi.fn().mockResolvedValue(transaction) as unknown as AuthRequest;

    await executeTransferPreview({ previewId: "preview-123", idempotencyKey: "stable-key-00000001" }, request);

    expect(transferPath()).toBe("/api/v1/transfers");
    const [, options] = vi.mocked(request).mock.calls[0];
    expect(JSON.parse(String(options?.body))).toEqual({ previewId: "preview-123", idempotencyKey: "stable-key-00000001" });
    expect(options?.financialMutation).toBe(true);
    expect(String(options?.body)).not.toContain("amount");
    expect(String(options?.body)).not.toContain("fromAccountId");
  });

  it("preserves exact money strings and rejects numeric preview money", () => {
    expect(parseTransferPreview(previewResponse)).toMatchObject({ amount: "1000.00", fee: "10.00", debitTotal: "1010.00" });
    expect(() => parseTransferPreview({ ...previewResponse, amount: 1000 })).toThrow("invalid amount");
  });
});
