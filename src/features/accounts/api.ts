import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { AuthRequest } from "@/features/auth/request-types";
import type { Account } from "@/features/accounts/types";

export const accountPath = "/api/v1/accounts";

export function getAccounts(request?: AuthRequest): Promise<Account[]> {
  const run = request ?? (<T>(path: string, options?: RequestInit) => apiRequest<T>(path, options));
  return run<unknown>(accountPath).then(parseAccounts);
}

export function parseAccounts(value: unknown): Account[] {
  if (!Array.isArray(value)) throw invalidContract("account list");
  return value.map((item, index) => parseAccount(item, index));
}

export function parseAccount(value: unknown, index?: number): Account {
  if (!isRecord(value)) throw invalidContract(index === undefined ? "account" : `account at index ${index}`);
  return {
    id: requiredString(value.id, "account id"),
    userId: requiredString(value.userId, "account owner"),
    accountNumber: requiredString(value.accountNumber, "account number"),
    accountType: requiredString(value.accountType, "account type"),
    balance: requiredMoney(value.balance, "account balance"),
    currency: requiredString(value.currency, "account currency"),
    status: requiredString(value.status, "account status"),
    createdAt: requiredString(value.createdAt, "account creation time"),
  };
}

function requiredString(value: unknown, field: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  throw invalidContract(field);
}

function requiredMoney(value: unknown, field: string): string {
  if (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value)) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  throw invalidContract(field);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function invalidContract(field: string): ApiError {
  return new ApiError(`The account response contains an invalid ${field}`, { kind: "unknown" });
}
