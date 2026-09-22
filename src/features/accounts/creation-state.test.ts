import { describe, expect, it } from "vitest";
import {
  accountCreationReducer,
  canonicalAccountRequest,
  createInitialAccountCreationState,
  matchesRecoveredAccount,
  validateAccountCreationDraft,
  type AccountCreationAttempt,
} from "@/features/accounts/creation-state";
import type { Account } from "@/features/accounts/types";

const attempt: AccountCreationAttempt = {
  version: 1,
  userId: "user-1",
  request: { accountType: "PERSONAL", currency: "VND", description: "Daily", idempotencyKey: "account-key-1234567890" },
  knownAccountIds: ["existing-1"],
  createdAt: "2026-08-29T00:00:00Z",
};

const recovered: Account = {
  id: "new-1", userId: "user-1", accountNumber: "100000000001", accountType: "PERSONAL", balance: "0", currency: "VND", status: "ACTIVE", createdAt: "2026-08-29T00:00:01Z", description: "Daily",
};

describe("account creation state", () => {
  it("restores an unfinished attempt as unknown without changing its request or key", () => {
    const restored = accountCreationReducer(createInitialAccountCreationState(), { type: "restore_finished", attempt });
    expect(restored).toMatchObject({ tag: "unknown", attempt });
    if (restored.tag !== "unknown") throw new Error("Expected unknown state");
    expect(accountCreationReducer(restored, { type: "submit_started", attempt })).toMatchObject({ tag: "submitting", attempt });
  });

  it("validates and canonicalizes only the approved request fields", () => {
    expect(validateAccountCreationDraft({ accountType: "", currency: "VND", description: "" })).toEqual({ accountType: "Choose Personal or Business." });
    expect(canonicalAccountRequest({ accountType: "BUSINESS", currency: "VND", description: "  Treasury  " }, "account-key-1234567890")).toEqual({
      accountType: "BUSINESS", currency: "VND", description: "Treasury", idempotencyKey: "account-key-1234567890",
    });
  });

  it("matches only a new authoritative account with the confirmed details", () => {
    expect(matchesRecoveredAccount(recovered, attempt)).toBe(true);
    expect(matchesRecoveredAccount({ ...recovered, id: "existing-1" }, attempt)).toBe(false);
    expect(matchesRecoveredAccount({ ...recovered, description: "Changed" }, attempt)).toBe(false);
  });
});
