import { beforeEach, describe, expect, it } from "vitest";
import { accountCreationStorageKey, loadAccountCreationAttempt, saveAccountCreationAttempt } from "@/features/accounts/creation-attempt-storage";
import type { AccountCreationAttempt } from "@/features/accounts/creation-state";

const attempt: AccountCreationAttempt = {
  version: 1,
  userId: "user-1",
  request: { accountType: "PERSONAL", currency: "VND", description: null, idempotencyKey: "account-key-1234567890" },
  knownAccountIds: [],
  createdAt: "2026-08-29T00:00:00Z",
};

describe("account creation attempt storage", () => {
  beforeEach(() => sessionStorage.clear());

  it("round-trips the exact unfinished request for refresh recovery", () => {
    saveAccountCreationAttempt(sessionStorage, attempt);
    expect(loadAccountCreationAttempt(sessionStorage, "user-1")).toEqual(attempt);
  });

  it("discards malformed or cross-user attempts", () => {
    sessionStorage.setItem(accountCreationStorageKey("user-1"), JSON.stringify({ ...attempt, request: { ...attempt.request, idempotencyKey: "short" } }));
    expect(loadAccountCreationAttempt(sessionStorage, "user-1")).toBeNull();
    expect(sessionStorage.getItem(accountCreationStorageKey("user-1"))).toBeNull();
    saveAccountCreationAttempt(sessionStorage, attempt);
    expect(loadAccountCreationAttempt(sessionStorage, "user-2")).toBeNull();
  });
});
