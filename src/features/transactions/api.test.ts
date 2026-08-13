import { describe, expect, it } from "vitest";
import { parseTransactionPage } from "@/features/transactions/api";

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
});
