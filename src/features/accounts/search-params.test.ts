import { describe, expect, it } from "vitest";
import { parseAccountSearchParams } from "@/features/accounts/search-params";

describe("parseAccountSearchParams", () => {
  it("keeps a valid account id", () => {
    expect(parseAccountSearchParams(new URLSearchParams("accountId=account-1"))).toEqual({ accountId: "account-1" });
  });

  it("does not invent an account when the parameter is absent", () => {
    expect(parseAccountSearchParams({})).toEqual({ accountId: undefined });
  });
});
