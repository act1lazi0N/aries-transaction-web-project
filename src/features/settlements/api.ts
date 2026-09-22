import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { exactDecimalString } from "@/lib/api/decimal";
import type { AuthRequest } from "@/features/auth/request-types";
import type { SettlementBatch, SettlementBatchPage, SettlementBatchSummary, SettlementItem } from "@/features/settlements/types";

export const settlementPaths = {
  batches: "/api/v1/settlements/batches",
  detail: (batchId: string) => `/api/v1/settlements/batches/${encodeURIComponent(batchId)}`,
} as const;

export function getSettlementBatch(batchId: string, request?: AuthRequest): Promise<SettlementBatch> {
  const run = request ?? (<T>(path: string, options?: RequestInit) => apiRequest<T>(path, options));
  return run<unknown>(settlementPaths.detail(batchId)).then(parseSettlementBatch);
}

export function getSettlementBatches(page: number, size: number, request: AuthRequest): Promise<SettlementBatchPage> {
  return request<unknown>(`${settlementPaths.batches}?page=${page}&size=${size}`).then(value => {
    if (!isRecord(value) || !Array.isArray(value.content)) throw invalidContract("settlement batch page");
    return { content: value.content.map(parseSettlementBatchSummary), page: requiredInteger(value.page, "page"), size: requiredInteger(value.size, "page size"), totalElements: requiredInteger(value.totalElements, "total elements"), totalPages: requiredInteger(value.totalPages, "total pages"), first: requiredBoolean(value.first, "first page"), last: requiredBoolean(value.last, "last page") };
  });
}

function parseSettlementBatchSummary(value: unknown): SettlementBatchSummary {
  if (!isRecord(value)) throw invalidContract("settlement batch summary");
  return { id: requiredString(value.id, "batch id"), currency: requiredString(value.currency, "currency"), grossAmount: requiredMoney(value.grossAmount, "gross amount"), feeAmount: requiredMoney(value.feeAmount, "fee amount"), netAmount: requiredMoney(value.netAmount, "net amount"), feeRateBps: requiredInteger(value.feeRateBps, "fee rate"), cutoffCompletedAt: requiredString(value.cutoffCompletedAt, "cutoff"), status: requiredString(value.status, "status"), createdAt: requiredString(value.createdAt, "created time") };
}

export function parseSettlementBatch(value: unknown): SettlementBatch {
  if (!isRecord(value)) throw invalidContract("settlement batch");
  if (!Array.isArray(value.items)) throw invalidContract("settlement items");
  return {
    id: requiredString(value.id, "settlement batch id"),
    currency: requiredString(value.currency, "settlement currency"),
    grossAmount: requiredMoney(value.grossAmount, "gross amount"),
    feeAmount: requiredMoney(value.feeAmount, "fee amount"),
    netAmount: requiredMoney(value.netAmount, "net amount"),
    feeRateBps: requiredInteger(value.feeRateBps, "fee rate"),
    idempotencyKey: requiredString(value.idempotencyKey, "idempotency key"),
    cutoffCompletedAt: requiredString(value.cutoffCompletedAt, "cutoff time"),
    status: requiredString(value.status, "settlement status"),
    createdAt: requiredString(value.createdAt, "creation time"),
    items: value.items.map((item, index) => parseSettlementItem(item, index)),
  };
}

function parseSettlementItem(value: unknown, index: number): SettlementItem {
  if (!isRecord(value)) throw invalidContract(`settlement item at index ${index}`);
  return {
    id: requiredString(value.id, `settlement item ${index} id`),
    transactionId: requiredString(value.transactionId, `settlement item ${index} transaction`),
    receiverAccountId: requiredString(value.receiverAccountId, `settlement item ${index} receiver`),
    grossAmount: requiredMoney(value.grossAmount, `settlement item ${index} gross amount`),
    feeAmount: requiredMoney(value.feeAmount, `settlement item ${index} fee amount`),
    netAmount: requiredMoney(value.netAmount, `settlement item ${index} net amount`),
    platformRevenue: requiredMoney(value.platformRevenue, `settlement item ${index} platform revenue`),
    receiverPayable: requiredMoney(value.receiverPayable, `settlement item ${index} receiver payable`),
    itemType: requiredString(value.itemType, `settlement item ${index} type`),
    currency: requiredString(value.currency, `settlement item ${index} currency`),
    payoutStatus: requiredString(value.payoutStatus, `settlement item ${index} payout status`),
  };
}

function requiredString(value: unknown, field: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  throw invalidContract(field);
}

function requiredMoney(value: unknown, field: string): string {
  const decimal = exactDecimalString(value);
  if (decimal !== null) return decimal;
  throw invalidContract(field);
}

function requiredInteger(value: unknown, field: string): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  throw invalidContract(field);
}
function requiredBoolean(value: unknown, field: string): boolean { if (typeof value === "boolean") return value; throw invalidContract(field); }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function invalidContract(field: string): ApiError {
  return new ApiError(`The settlement response contains an invalid ${field}`, { kind: "unknown" });
}
