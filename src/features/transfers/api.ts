import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { parseTransaction } from "@/features/transactions/api";
import type { Transaction } from "@/features/transactions/types";
import type { AuthRequest } from "@/features/auth/request-types";
import type {
  MaskedTransferAccount,
  TransferExecuteRequest,
  TransferPreview,
  TransferPreviewRequest,
} from "@/features/transfers/types";

export function transferPath() { return "/api/v1/transfers"; }
export function transferPreviewPath() { return "/api/v1/transfers/preview"; }

export function createTransferPreview(request: TransferPreviewRequest, authRequest?: AuthRequest): Promise<TransferPreview> {
  const run = authRequest ?? (<T>(path: string, options?: RequestInit) => apiRequest<T>(path, options));
  return run<unknown>(transferPreviewPath(), {
    method: "POST",
    body: JSON.stringify(request),
  }).then(parseTransferPreview);
}
export function executeTransferPreview(request: TransferExecuteRequest, authRequest?: AuthRequest): Promise<Transaction> {
  const run = authRequest ?? (<T>(path: string, options?: RequestInit) => apiRequest<T>(path, options));
  return run<unknown>(transferPath(), {
    method: "POST",
    body: JSON.stringify(request),
    financialMutation: true,
  }).then(parseTransaction);
}

export function parseTransferPreview(value: unknown): TransferPreview {
  if (!isRecord(value)) throw invalidContract("preview");
  const currency = requiredString(value.currency, "currency");
  if (currency !== "VND") throw invalidContract("currency");
  return {
    previewId: requiredString(value.previewId, "preview ID"),
    expiresAt: requiredTimestamp(value.expiresAt, "expiry"),
    source: parseMaskedAccount(value.source, "source"),
    recipient: parseMaskedAccount(value.recipient, "recipient"),
    amount: requiredMoneyString(value.amount, "amount"),
    fee: requiredMoneyString(value.fee, "fee"),
    debitTotal: requiredMoneyString(value.debitTotal, "debit total"),
    currency,
    warnings: requiredWarnings(value.warnings),
  };
}

function parseMaskedAccount(value: unknown, field: string): MaskedTransferAccount {
  if (!isRecord(value)) throw invalidContract(`${field} account`);
  return {
    accountNumberMasked: requiredString(value.accountNumberMasked, `${field} masked account number`),
    displayName: requiredString(value.displayName, `${field} display name`),
  };
}

function requiredWarnings(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== "string")) throw invalidContract("warnings");
  return [...value];
}

function requiredMoneyString(value: unknown, field: string): string {
  if (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value)) return value;
  throw invalidContract(field);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  throw invalidContract(field);
}

function requiredTimestamp(value: unknown, field: string): string {
  const timestamp = requiredString(value, field);
  if (!Number.isFinite(Date.parse(timestamp))) throw invalidContract(field);
  return timestamp;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function invalidContract(field: string): ApiError {
  return new ApiError(`The transfer preview response contains an invalid ${field}`, { kind: "unknown" });
}
