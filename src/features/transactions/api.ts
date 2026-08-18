import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { exactDecimalString } from "@/lib/api/decimal";
import type { PageResponse, Transaction } from "@/features/transactions/types";
import type { AuthRequest } from "@/features/auth/request-types";

export type TransactionHistoryParams = {
  accountId: string;
  page?: number;
  size?: number;
  sort?: string;
  accessToken?: string;
};

export function transactionHistoryPath({ accountId, page = 0, size = 20, sort = "createdAt,desc" }: TransactionHistoryParams): string {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort });
  return `/api/v1/transfers/account/${encodeURIComponent(accountId)}?${params.toString()}`;
}

export function transactionDetailPath(transactionId: string): string {
  return `/api/v1/transfers/${encodeURIComponent(transactionId)}`;
}

export function getTransactionHistory(params: TransactionHistoryParams, request?: AuthRequest): Promise<PageResponse<Transaction>> {
  const path = transactionHistoryPath(params);
  const response = request ? request<unknown>(path) : apiRequest<unknown>(path, { accessToken: params.accessToken });
  return response.then(parseTransactionPage);
}

export function getTransaction(transactionId: string, request?: AuthRequest): Promise<Transaction> {
  const path = transactionDetailPath(transactionId);
  const response = request ? request<unknown>(path) : apiRequest<unknown>(path);
  return response.then(value => parseTransaction(value));
}

export function parseTransactionPage(value: unknown): PageResponse<Transaction> {
  if (!isRecord(value) || !Array.isArray(value.content)) throw invalidContract("transaction page");
  return {
    content: value.content.map((item, index) => parseTransaction(item, index)),
    number: requiredNumber(value.number, "page number"),
    size: requiredNumber(value.size, "page size"),
    totalElements: requiredNumber(value.totalElements, "total elements"),
    totalPages: requiredNumber(value.totalPages, "total pages"),
    first: requiredBoolean(value.first, "first page"),
    last: requiredBoolean(value.last, "last page"),
    empty: requiredBoolean(value.empty, "empty flag"),
  };
}

export function parseTransaction(value: unknown, index?: number): Transaction {
  if (!isRecord(value)) throw invalidContract(index === undefined ? "transaction" : `transaction at index ${index}`);
  return {
    id: requiredString(value.id, "transaction id"),
    fromAccountId: requiredString(value.fromAccountId, "source account"),
    toAccountId: requiredString(value.toAccountId, "destination account"),
    amount: requiredMoney(value.amount, "transaction amount"),
    currency: requiredString(value.currency, "transaction currency"),
    status: requiredString(value.status, "transaction status"),
    idempotencyKey: requiredString(value.idempotencyKey, "transaction idempotency key"),
    description: nullableString(value.description, "transaction description"),
    failureReason: nullableString(value.failureReason, "transaction failure reason"),
    originalTransactionId: nullableString(value.originalTransactionId, "original transaction id"),
    refundedAmount: nullableMoney(value.refundedAmount, "refunded amount"),
    createdAt: requiredString(value.createdAt, "transaction creation time"),
    completedAt: nullableString(value.completedAt, "transaction completion time"),
  };
}

function requiredMoney(value: unknown, field: string): string {
  const decimal = exactDecimalString(value);
  if (decimal !== null) return decimal;
  throw invalidContract(field);
}

function nullableMoney(value: unknown, field: string): string | null {
  return value === null ? null : requiredMoney(value, field);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  throw invalidContract(field);
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null) return null;
  return requiredString(value, field);
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  throw invalidContract(field);
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value === "boolean") return value;
  throw invalidContract(field);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function invalidContract(field: string): ApiError {
  return new ApiError(`The transaction response contains an invalid ${field}`, { kind: "unknown" });
}
