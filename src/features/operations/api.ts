import type { AuthRequest } from "@/features/auth/request-types";
import { exactDecimalString } from "@/lib/api/decimal";
import { ApiError } from "@/lib/api/errors";
import { parseTransactionRead } from "@/features/transactions/api";
import type { TransactionRead } from "@/features/transactions/types";
import type { CustomerDetail, CustomerFilters, CustomerSummary, LedgerEntry, LedgerFilters, LedgerJournal, LedgerPage, OperationTransactionFilters, OperationsOverview, PageResponse } from "@/features/operations/types";

export function getOperationsOverview(range: string, request: AuthRequest): Promise<OperationsOverview> {
  return request<unknown>(`/api/v1/operations/overview?range=${encodeURIComponent(range)}`).then(parseOperationsOverview);
}

export function getCustomers(filters: CustomerFilters, request: AuthRequest): Promise<PageResponse<CustomerSummary>> {
  return request<unknown>(`/api/v1/operations/customers?${params(filters)}`).then(value => parsePage(value, parseCustomer));
}

export function getCustomer(customerId: string, request: AuthRequest): Promise<CustomerDetail> {
  return request<unknown>(`/api/v1/operations/customers/${encodeURIComponent(customerId)}`).then(parseCustomerDetail);
}

export function updateCustomerStatus(customerId: string, input: { status: "ACTIVE" | "SUSPENDED"; reason: string; expectedVersion: number }, request: AuthRequest): Promise<CustomerSummary> {
  return request<unknown>(`/api/v1/operations/customers/${encodeURIComponent(customerId)}/status`, { method: "PATCH", body: JSON.stringify(input), financialMutation: true }).then(parseCustomer);
}

export function getOperationsTransactions(filters: OperationTransactionFilters, request: AuthRequest): Promise<PageResponse<TransactionRead>> {
  return request<unknown>(`/api/v1/operations/transactions?${params(filters)}`).then(value => parsePage(value, parseTransactionRead));
}

export function getLedgerEntries(filters: LedgerFilters, request: AuthRequest): Promise<LedgerPage> {
  return request<unknown>(`/api/v1/operations/ledger-entries?${params(filters)}`).then(parseLedgerPage);
}

export function getLedgerJournal(transactionId: string, request: AuthRequest): Promise<LedgerJournal> {
  return request<unknown>(`/api/v1/operations/ledger-journals/${encodeURIComponent(transactionId)}`).then(parseLedgerJournal);
}

function params(value: Record<string, unknown>): string {
  const result = new URLSearchParams();
  Object.entries(value).forEach(([key, item]) => { if (item !== undefined && item !== null && item !== "") result.set(key, String(item)); });
  return result.toString();
}

function parseOperationsOverview(value: unknown): OperationsOverview {
  const source = record(value, "operations overview");
  const range = string(source.range, "overview range");
  if (range !== "24h" && range !== "7d" && range !== "30d") throw invalid("overview range");
  return {
    range,
    generatedAt: string(source.generatedAt, "generated time"),
    customers: numberGroup(source.customers, ["users", "merchants", "active", "suspended"]),
    transactions: numberGroup(source.transactions, ["total", "pending", "failed"]),
    reconciliation: numberGroup(source.reconciliation, ["runs", "exceptions"]),
    settlements: numberGroup(source.settlements, ["batches", "pending", "failed"]),
    ledger: { ...numberGroup(source.ledger, ["entries", "journals", "unbalancedJournals"]), healthy: boolean(record(source.ledger, "ledger health").healthy, "ledger health") },
  };
}

function parseCustomer(value: unknown): CustomerSummary {
  const source = record(value, "customer");
  const role = string(source.role, "customer role");
  const status = string(source.status, "customer status");
  if (role !== "USER" && role !== "MERCHANT") throw invalid("customer role");
  if (status !== "ACTIVE" && status !== "SUSPENDED") throw invalid("customer status");
  return { id: string(source.id, "customer id"), fullName: string(source.fullName, "customer name"), email: string(source.email, "customer email"), role, status, version: number(source.version, "customer version"), createdAt: string(source.createdAt, "created time"), updatedAt: string(source.updatedAt, "updated time") };
}

function parseCustomerDetail(value: unknown): CustomerDetail {
  const source = record(value, "customer detail");
  if (!Array.isArray(source.accounts) || !Array.isArray(source.recentActivity)) throw invalid("customer detail collections");
  return {
    customer: parseCustomer(source.customer),
    accounts: source.accounts.map(item => { const account = record(item, "customer account"); return { maskedAccountNumber: string(account.maskedAccountNumber, "masked account"), type: string(account.type, "account type"), currency: string(account.currency, "account currency"), status: string(account.status, "account status"), createdAt: string(account.createdAt, "account created time") }; }),
    recentActivity: source.recentActivity.map(item => parseTransactionRead(item)),
  };
}

function parseLedgerPage(value: unknown): LedgerPage {
  const source = record(value, "ledger page");
  if (!Array.isArray(source.content)) throw invalid("ledger content");
  return { content: source.content.map(parseLedgerEntry), nextCursor: source.nextCursor === null ? null : string(source.nextCursor, "ledger cursor"), hasMore: boolean(source.hasMore, "ledger has more") };
}

function parseLedgerJournal(value: unknown): LedgerJournal {
  const source = record(value, "ledger journal");
  if (!Array.isArray(source.entries)) throw invalid("journal entries");
  return { transactionId: string(source.transactionId, "journal transaction"), entries: source.entries.map(parseLedgerEntry), totalDebits: money(source.totalDebits, "total debits"), totalCredits: money(source.totalCredits, "total credits"), balanced: boolean(source.balanced, "journal invariant") };
}

function parseLedgerEntry(value: unknown): LedgerEntry {
  const source = record(value, "ledger entry");
  const direction = string(source.direction, "ledger direction");
  if (direction !== "DEBIT" && direction !== "CREDIT") throw invalid("ledger direction");
  return { entryId: string(source.entryId, "entry id"), transactionId: string(source.transactionId, "transaction id"), maskedAccountReference: string(source.maskedAccountReference, "masked account"), direction, amount: money(source.amount, "ledger amount"), currency: string(source.currency, "ledger currency"), entryType: string(source.entryType, "entry type"), createdAt: string(source.createdAt, "entry time"), balanced: boolean(source.balanced, "entry invariant") };
}

function parsePage<T>(value: unknown, parser: (item: unknown) => T): PageResponse<T> {
  const source = record(value, "page");
  if (!Array.isArray(source.content)) throw invalid("page content");
  return { content: source.content.map(parser), page: number(source.page, "page number"), size: number(source.size, "page size"), totalElements: number(source.totalElements, "total elements"), totalPages: number(source.totalPages, "total pages"), first: boolean(source.first, "first page"), last: boolean(source.last, "last page") };
}

function numberGroup<T extends string>(value: unknown, keys: readonly T[]): Record<T, number> {
  const source = record(value, "overview group");
  return Object.fromEntries(keys.map(key => [key, number(source[key], key)])) as Record<T, number>;
}
function record(value: unknown, field: string): Record<string, unknown> { if (typeof value === "object" && value !== null) return value as Record<string, unknown>; throw invalid(field); }
function string(value: unknown, field: string): string { if (typeof value === "string" && value.length > 0) return value; throw invalid(field); }
function number(value: unknown, field: string): number { if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value; throw invalid(field); }
function boolean(value: unknown, field: string): boolean { if (typeof value === "boolean") return value; throw invalid(field); }
function money(value: unknown, field: string): string { const result = exactDecimalString(value); if (result !== null) return result; throw invalid(field); }
function invalid(field: string): ApiError { return new ApiError(`The operations response contains an invalid ${field}`, { kind: "unknown" }); }
