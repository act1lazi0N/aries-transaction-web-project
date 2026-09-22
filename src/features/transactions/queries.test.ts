import { describe, expect, it } from "vitest";
import { transactionKeys } from "@/features/transactions/queries";

describe("transaction query keys", () => {
  it("separates user-scoped history and detail reads", () => {
    const params = { accountId: "account-1", page: 0, size: 20, sort: "createdAt,desc" };
    expect(transactionKeys.history("user-1", params)).not.toEqual(transactionKeys.history("user-2", params));
    expect(transactionKeys.detail("user-1", "transaction-1")).not.toEqual(transactionKeys.detail("user-2", "transaction-1"));
  });
});
