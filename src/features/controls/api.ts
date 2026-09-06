import { apiRequest, type ApiResponse } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { exactDecimalString } from "@/lib/api/decimal";
import type { AuthRequest } from "@/features/auth/request-types";
import type { ReconciliationException, ReconciliationRequest, ReconciliationRun, ReconciliationRunPage, ReconciliationRunSummary } from "@/features/controls/types";

export const reconciliationPaths = {
  runs: "/api/v1/reconciliation/runs",
  detail: (runId: string) => `/api/v1/reconciliation/runs/${encodeURIComponent(runId)}`,
} as const;

export function createReconciliationRun(request: ReconciliationRequest, authRequest?: AuthRequest): Promise<ReconciliationRun> {
  const run = authRequest ?? (<T>(path: string, options?: RequestInit) => apiRequest<T>(path, options));
  return run<unknown>(reconciliationPaths.runs, {
    method: "POST",
    body: JSON.stringify(request),
  }).then(parseReconciliationRun);
}

export function getReconciliationRun(runId: string, authRequest?: AuthRequest): Promise<ReconciliationRun> {
  const run = authRequest ?? (<T>(path: string, options?: RequestInit) => apiRequest<T>(path, options));
  return run<unknown>(reconciliationPaths.detail(runId)).then(parseReconciliationRun);
}

export function getReconciliationRuns(page: number, size: number, authRequest: AuthRequest): Promise<ReconciliationRunPage> {
  return authRequest<unknown>(`${reconciliationPaths.runs}?page=${page}&size=${size}`).then(value => {
    if (!isRecord(value) || !Array.isArray(value.content)) throw invalidContract("reconciliation run page");
    return { content: value.content.map(parseReconciliationRunSummary), page: requiredCount(value.page, "page"), size: requiredCount(value.size, "page size"), totalElements: requiredCount(value.totalElements, "total elements"), totalPages: requiredCount(value.totalPages, "total pages"), first: requiredBoolean(value.first, "first page"), last: requiredBoolean(value.last, "last page") };
  });
}

function parseReconciliationRunSummary(value: unknown): ReconciliationRunSummary {
  if (!isRecord(value)) throw invalidContract("reconciliation run summary");
  return { id: requiredString(value.id, "run id"), currency: requiredString(value.currency, "currency"), windowStart: requiredString(value.windowStart, "window start"), windowEnd: requiredString(value.windowEnd, "window end"), status: requiredString(value.status, "status"), sourceCount: requiredCount(value.sourceCount, "source count"), reportingCount: requiredCount(value.reportingCount, "reporting count"), exceptionCount: requiredCount(value.exceptionCount, "exception count"), createdAt: requiredString(value.createdAt, "created time"), completedAt: nullableString(value.completedAt, "completed time") };
}

export function parseReconciliationRun(value: unknown): ReconciliationRun {
  if (!isRecord(value)) throw invalidContract("reconciliation run");
  if (!Array.isArray(value.exceptions)) throw invalidContract("reconciliation exceptions");
  return {
    id: requiredString(value.id, "reconciliation run id"),
    currency: requiredString(value.currency, "reconciliation currency"),
    windowStart: requiredString(value.windowStart, "reconciliation window start"),
    windowEnd: requiredString(value.windowEnd, "reconciliation window end"),
    status: requiredString(value.status, "reconciliation status"),
    sourceCount: requiredCount(value.sourceCount, "source count"),
    reportingCount: requiredCount(value.reportingCount, "reporting count"),
    exceptionCount: requiredCount(value.exceptionCount, "exception count"),
    createdAt: requiredString(value.createdAt, "reconciliation creation time"),
    completedAt: nullableString(value.completedAt, "reconciliation completion time"),
    exceptions: value.exceptions.map((item, index) => parseReconciliationException(item, index)),
  };
}

function parseReconciliationException(value: unknown, index: number): ReconciliationException {
  if (!isRecord(value)) throw invalidContract(`reconciliation exception at index ${index}`);
  return {
    id: requiredString(value.id, `exception ${index} id`),
    exceptionType: requiredString(value.exceptionType, `exception ${index} type`),
    transactionId: requiredString(value.transactionId, `exception ${index} transaction`),
    sourceAmount: requiredMoney(value.sourceAmount, `exception ${index} source amount`),
    reportingAmount: requiredMoney(value.reportingAmount, `exception ${index} reporting amount`),
    sourceStatus: requiredString(value.sourceStatus, `exception ${index} source status`),
    reportingStatus: requiredString(value.reportingStatus, `exception ${index} reporting status`),
    details: requiredString(value.details, `exception ${index} details`),
    createdAt: requiredString(value.createdAt, `exception ${index} creation time`),
  };
}

function requiredString(value: unknown, field: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  throw invalidContract(field);
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null) return null;
  return requiredString(value, field);
}

function requiredCount(value: unknown, field: string): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  throw invalidContract(field);
}
function requiredBoolean(value: unknown, field: string): boolean { if (typeof value === "boolean") return value; throw invalidContract(field); }

function requiredMoney(value: unknown, field: string): string {
  const decimal = exactDecimalString(value);
  if (decimal !== null) return decimal;
  throw invalidContract(field);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function invalidContract(field: string): ApiError {
  return new ApiError(`The reconciliation response contains an invalid ${field}`, { kind: "unknown" });
}

export type ReconciliationApiEnvelope = ApiResponse<ReconciliationRun>;
