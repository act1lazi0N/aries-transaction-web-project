import type { AccountCreationAttempt } from "@/features/accounts/creation-state";

const keyPrefix = "aries:account-creation:v1:";

export function accountCreationStorageKey(userId: string) {
  return `${keyPrefix}${userId}`;
}

export function saveAccountCreationAttempt(storage: Storage, attempt: AccountCreationAttempt) {
  storage.setItem(accountCreationStorageKey(attempt.userId), JSON.stringify(attempt));
}

export function loadAccountCreationAttempt(storage: Storage, userId: string): AccountCreationAttempt | null {
  const value = storage.getItem(accountCreationStorageKey(userId));
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    const attempt = parseAttempt(parsed, userId);
    if (!attempt) storage.removeItem(accountCreationStorageKey(userId));
    return attempt;
  } catch {
    storage.removeItem(accountCreationStorageKey(userId));
    return null;
  }
}

export function clearAccountCreationAttempt(storage: Storage, userId: string) {
  storage.removeItem(accountCreationStorageKey(userId));
}

function parseAttempt(value: unknown, userId: string): AccountCreationAttempt | null {
  if (!isRecord(value) || value.version !== 1 || value.userId !== userId || !isRecord(value.request) || !Array.isArray(value.knownAccountIds)) return null;
  const request = value.request;
  if ((request.accountType !== "PERSONAL" && request.accountType !== "BUSINESS")
    || request.currency !== "VND"
    || (request.description !== null && typeof request.description !== "string")
    || typeof request.idempotencyKey !== "string"
    || request.idempotencyKey.length < 16
    || request.idempotencyKey.length > 64
    || !value.knownAccountIds.every(item => typeof item === "string")
    || typeof value.createdAt !== "string") return null;
  return {
    version: 1,
    userId,
    request: {
      accountType: request.accountType,
      currency: "VND",
      description: request.description,
      idempotencyKey: request.idempotencyKey,
    },
    knownAccountIds: value.knownAccountIds,
    createdAt: value.createdAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
