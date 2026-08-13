import { describe, expect, it } from "vitest";
import { parseTransactionSearchParams } from "@/features/transactions/search-params";

describe("parseTransactionSearchParams", () => {
  it("parses valid URL state", () => {
    expect(parseTransactionSearchParams(new URLSearchParams("page=2&size=50&sort=createdAt,asc"))).toEqual({ page: 2, size: 50, sort: "createdAt,asc" });
  });

  it("falls back safely for invalid or unsafe pagination", () => {
    expect(parseTransactionSearchParams({ page: "-1", size: "1000", sort: undefined })).toEqual({ page: 0, size: 20, sort: "createdAt,desc" });
  });

  it("preserves a restorable transaction detail id", () => {
    expect(parseTransactionSearchParams(new URLSearchParams("accountId=account-1&transactionId=tx-1"))).toMatchObject({ accountId: "account-1", transactionId: "tx-1" });
  });
});
