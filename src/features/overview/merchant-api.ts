import type { AuthRequest } from "@/features/auth/request-types";
import type { MerchantCurrencyOverview, MerchantOverview } from "@/features/overview/merchant-types";
import { exactDecimalString } from "@/lib/api/decimal";
import { ApiError } from "@/lib/api/errors";

export function getMerchantOverview(range: string, timezone: string, request: AuthRequest): Promise<MerchantOverview> {
  const query = new URLSearchParams({ range, timezone });
  return request<unknown>(`/api/v1/merchant/overview?${query}`).then(parseMerchantOverview);
}

export function parseMerchantOverview(value: unknown): MerchantOverview {
  const source = record(value, "merchant overview");
  const range = string(source.range, "range");
  if (range !== "7d" && range !== "30d" && range !== "90d") throw invalid("range");
  if (!Array.isArray(source.currencies)) throw invalid("currency buckets");
  return { range, timezone: string(source.timezone, "timezone"), generatedAt: string(source.generatedAt, "generated time"), currencies: source.currencies.map(parseCurrency) };
}

function parseCurrency(value: unknown): MerchantCurrencyOverview {
  const source = record(value, "currency bucket");
  if (!Array.isArray(source.trend)) throw invalid("trend");
  return { currency: string(source.currency, "currency"), balance: money(source.balance, "balance"), inflow: money(source.inflow, "inflow"), outflow: money(source.outflow, "outflow"), refunds: money(source.refunds, "refunds"), pending: money(source.pending, "pending"), pendingCount: integer(source.pendingCount, "pending count"), settlementNet: money(source.settlementNet, "settlement net"), trend: source.trend.map(item => { const point = record(item, "trend point"); return { date: string(point.date, "trend date"), inflow: money(point.inflow, "trend inflow"), outflow: money(point.outflow, "trend outflow") }; }) };
}
function record(value: unknown, field: string): Record<string, unknown> { if (typeof value === "object" && value !== null) return value as Record<string, unknown>; throw invalid(field); }
function string(value: unknown, field: string): string { if (typeof value === "string" && value.length > 0) return value; throw invalid(field); }
function integer(value: unknown, field: string): number { if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value; throw invalid(field); }
function money(value: unknown, field: string): string { const result = exactDecimalString(value); if (result !== null) return result; throw invalid(field); }
function invalid(field: string): ApiError { return new ApiError(`The merchant overview response contains an invalid ${field}`, { kind: "unknown" }); }
