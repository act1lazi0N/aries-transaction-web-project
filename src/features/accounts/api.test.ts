import { describe, expect, it, vi } from "vitest";
import { createAccount, parseAccounts } from "@/features/accounts/api";

const account = {
  id: "account-1",
  userId: "user-1",
  accountNumber: "100000000001",
  accountType: "PERSONAL",
  balance: "1000000000000000000.000000000000000001",
  currency: "VND",
  status: "ACTIVE",
  createdAt: "2026-08-18T00:00:00Z",
  description: null,
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

  it("sends only the strict create-account contract and parses the authoritative snapshot", async () => {
    const request = vi.fn().mockResolvedValue({ ...account, description: "Daily operations" });
    const payload = { accountType: "PERSONAL" as const, currency: "VND" as const, description: "Daily operations", idempotencyKey: "account-key-1234567890" };

    await expect(createAccount(payload, request)).resolves.toMatchObject({ accountNumber: account.accountNumber, description: "Daily operations" });
    expect(request).toHaveBeenCalledWith("/api/v1/accounts", {
      method: "POST",
      body: JSON.stringify(payload),
      financialMutation: true,
    });
    expect(Object.keys(JSON.parse(request.mock.calls[0]?.[1]?.body as string)).sort()).toEqual(["accountType", "currency", "description", "idempotencyKey"]);
  });
});
