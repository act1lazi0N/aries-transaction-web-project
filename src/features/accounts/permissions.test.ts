import { describe, expect, it } from "vitest";
import { transactionCapabilities } from "@/features/accounts/permissions";
import type { Transaction } from "@/features/transactions/types";

const transaction: Transaction = {
  id: "tx-1",
  fromAccountId: "account-1",
  toAccountId: "account-2",
  amount: "1000",
  currency: "VND",
  status: "COMPLETED",
  idempotencyKey: "idempotency-key-1",
  description: null,
  failureReason: null,
  originalTransactionId: null,
  refundedAmount: null,
  createdAt: "2026-08-18T00:00:00Z",
  completedAt: "2026-08-18T00:00:01Z",
};

describe("transactionCapabilities", () => {
  it("matches backend reversal roles", () => {
    expect(transactionCapabilities(transaction, { role: "ADMIN" }).canReverse).toBe(true);
    expect(transactionCapabilities(transaction, { role: "MERCHANT" }).canReverse).toBe(false);
  });

  it("allows merchant refund only for an owned receiving account", () => {
    expect(transactionCapabilities(transaction, { role: "MERCHANT", ownedAccountIds: new Set(["account-2"]) }).canRefund).toBe(true);
    expect(transactionCapabilities(transaction, { role: "MERCHANT", ownedAccountIds: new Set(["account-1"]) }).canRefund).toBe(false);
  });

  it("keeps partial refunds available and reversal unavailable", () => {
    expect(transactionCapabilities({ ...transaction, status: "PARTIALLY_REFUNDED" }, { role: "OPERATOR" })).toEqual({ canReverse: false, canRefund: true });
  });
});
