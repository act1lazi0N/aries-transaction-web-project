import { describe, expect, it } from "vitest";
import { parseTransaction, parseTransactionPage, parseTransactionRead } from "@/features/transactions/api";

const transaction = {
  id: "tx-1",
  fromAccountId: "account-1",
  toAccountId: "account-2",
  amount: "1000000000000000000.000000000000000001",
  currency: "VND",
  status: "COMPLETED",
  idempotencyKey: "idempotency-key-1",
  description: null,
  failureReason: null,
  originalTransactionId: null,
  refundedAmount: null,
  createdAt: "2026-08-13T00:00:00Z",
  completedAt: "2026-08-13T00:00:01Z",
  fromParty: { accountNumberDisplay: "100000000001", exposure: "FULL_OWNED", displayName: "Everyday account", ownedByRequester: true },
  toParty: { accountNumberDisplay: "******7788", exposure: "MASKED_COUNTERPARTY", displayName: "Verified recipient", ownedByRequester: false },
  direction: "OUTGOING",
};

function page(content: unknown[]) {
  return { content, number: 0, size: 20, totalElements: content.length, totalPages: 1, first: true, last: true, empty: content.length === 0 };
}

describe("parseTransactionPage", () => {
  it("preserves exact decimal strings at the API boundary", () => {
    expect(parseTransactionPage(page([transaction])).content[0]?.amount).toBe(transaction.amount);
  });

  it("normalizes legacy finite numeric amounts without crashing the table", () => {
    expect(parseTransactionPage(page([{ ...transaction, amount: 1000.25 }])).content[0]?.amount).toBe("1000.25");
  });

  it("rejects malformed money instead of rendering an unsafe value", () => {
    expect(() => parseTransactionPage(page([{ ...transaction, amount: "not-money" }]))).toThrow("invalid transaction amount");
  });

  it("keeps projection optional on mutation snapshots but mandatory on reads", () => {
    const { fromParty: _fromParty, toParty: _toParty, direction: _direction, ...mutationSnapshot } = transaction;
    expect(parseTransaction(mutationSnapshot)).not.toHaveProperty("direction");
    expect(() => parseTransactionRead(mutationSnapshot)).toThrow("invalid source party");
  });

  it("fails closed instead of exposing a foreign number marked as fully owned", () => {
    const parsed = parseTransactionRead({ ...transaction, toParty: { ...transaction.toParty, exposure: "FULL_OWNED", ownedByRequester: false, accountNumberDisplay: "999999999999" } });
    expect(parsed.toParty).toEqual({ accountNumberDisplay: null, exposure: "UNAVAILABLE", displayName: null, ownedByRequester: false });
  });
});
