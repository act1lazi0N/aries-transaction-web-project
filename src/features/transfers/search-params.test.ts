import { describe, expect, it } from "vitest";
import { parseTransferSearchParams, transferRoutePath } from "@/features/transfers/search-params";

describe("transfer search params", () => {
  it("defaults invalid modes to external and trims identifiers", () => {
    expect(parseTransferSearchParams({ mode: "invalid", accountId: " account-1 ", transactionId: " " })).toEqual({ mode: "external", accountId: "account-1", transactionId: undefined });
  });

  it("round-trips the restorable transfer context", () => {
    const path = transferRoutePath({ mode: "own-accounts", accountId: "account 1", transactionId: "transaction-2" });
    expect(path).toBe("/transfers?mode=own-accounts&accountId=account+1&transactionId=transaction-2");
    expect(parseTransferSearchParams(new URL(path, "https://aries.local").searchParams)).toEqual({ mode: "own-accounts", accountId: "account 1", transactionId: "transaction-2" });
  });
});
