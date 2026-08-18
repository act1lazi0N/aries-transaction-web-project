import { describe, expect, it } from "vitest";
import { parseAccounts } from "@/features/accounts/api";

const account = {
  id: "account-1",
  userId: "user-1",
  accountNumber: "100000000001",
  accountType: "PERSONAL",
  balance: "1000000000000000000.000000000000000001",
  currency: "VND",
  status: "ACTIVE",
  createdAt: "2026-08-18T00:00:00Z",
};

describe("parseAccounts", () => {
  it("preserves exact account balance strings", () => {
    expect(parseAccounts([account])[0]?.balance).toBe(account.balance);
  });

  it("normalizes finite legacy numeric balances", () => {
    expect(parseAccounts([{ ...account, balance: 1000.25 }])[0]?.balance).toBe("1000.25");
  });

  it("rejects malformed account contracts", () => {
    expect(() => parseAccounts([{ ...account, balance: "not-money" }])).toThrow("invalid account balance");
  });
});
