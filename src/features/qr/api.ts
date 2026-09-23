import type { AuthRequest } from "@/features/auth/request-types";
import { ApiError, userFacingErrorMessage } from "@/lib/api/errors";

export type QrType = "ACCOUNT" | "PAYMENT_REQUEST";
export type QrCode = {
  id: string; payload: string; type: QrType; state: "ACTIVE" | "PAID" | "REVOKED" | "EXPIRED";
  amount: string | null; currency: "VND"; description: string | null;
  createdAt: string; expiresAt: string | null; transactionId: string | null;
};
export type ResolvedQr = Pick<QrCode, "type" | "amount" | "currency" | "description" | "expiresAt"> & {
  qrCodeId: string; recipient: { accountNumberMasked: string; displayName: string };
};
export type CreateQr = { type: "ACCOUNT"; currency: "VND"; amount?: never; description?: never }
  | { type: "PAYMENT_REQUEST"; currency: "VND"; amount: string; description?: string };
export type QrPage = { content: QrCode[]; totalPages: number; number: number };
export const paymentPayloadPattern = /^aries:pay:v1:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const qrKeys = { all: ["payment-qr"] as const, list: (user: string, account: string, page: number) => ["payment-qr", user, account, page] as const };

export function contractError(): never { throw new ApiError("The service returned an invalid response. Refresh before continuing.", { kind: "unknown" }); }
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return contractError();
  return value as Record<string, unknown>;
}
export function text(value: unknown): string { return typeof value === "string" && value.length > 0 ? value : contractError(); }
export function nullableText(value: unknown): string | null { return value == null ? null : typeof value === "string" ? value : contractError(); }
export function timestamp(value: unknown): string { const result = text(value); return Number.isFinite(Date.parse(result)) ? result : contractError(); }
export function enumeration<T extends string>(value: unknown, allowed: readonly T[]): T { return typeof value === "string" && allowed.includes(value as T) ? value as T : contractError(); }
function values(value: Record<string, unknown>) {
  const type = enumeration(value.type, ["ACCOUNT", "PAYMENT_REQUEST"] as const);
  const amount = nullableText(value.amount);
  const description = nullableText(value.description);
  const expiresAt = value.expiresAt == null ? null : timestamp(value.expiresAt);
  if (type === "PAYMENT_REQUEST" && (!amount || !/^\d{1,16}\.\d{2}$/.test(amount) || !expiresAt)) return contractError();
  if (type === "ACCOUNT" && (amount !== null || description !== null || expiresAt !== null)) return contractError();
  return { type, amount, description, expiresAt, currency: enumeration(value.currency, ["VND"] as const) };
}
export function parseQr(input: unknown): QrCode {
  const value = record(input); const id = text(value.id); const payload = text(value.payload);
  if (!paymentPayloadPattern.test(payload) || payload !== `aries:pay:v1:${id}`) return contractError();
  return { ...values(value), id, payload, state: enumeration(value.state, ["ACTIVE", "PAID", "REVOKED", "EXPIRED"] as const), createdAt: timestamp(value.createdAt), transactionId: nullableText(value.transactionId) };
}
export function parseResolvedQr(input: unknown): ResolvedQr {
  const value = record(input); const recipient = record(value.recipient); const qrCodeId = text(value.qrCodeId);
  if (!paymentPayloadPattern.test(`aries:pay:v1:${qrCodeId}`)) return contractError();
  return { ...values(value), qrCodeId, recipient: { displayName: text(recipient.displayName), accountNumberMasked: text(recipient.accountNumberMasked) } };
}
export async function listQr(request: AuthRequest, accountId: string, page: number): Promise<QrPage> {
  const value = record(await request(`/api/v1/accounts/${encodeURIComponent(accountId)}/qr-codes?page=${page}&size=20`, { cache: "no-store" }));
  if (!Array.isArray(value.content) || !Number.isInteger(value.totalPages) || Number(value.totalPages) < 0 || !Number.isInteger(value.number) || Number(value.number) < 0) return contractError();
  return { content: value.content.map(parseQr), totalPages: Number(value.totalPages), number: Number(value.number) };
}
export async function createQr(request: AuthRequest, account: string, body: CreateQr, key: string) {
  return parseQr(await request(`/api/v1/accounts/${encodeURIComponent(account)}/qr-codes`, { method: "POST", body: JSON.stringify(body), headers: { "Idempotency-Key": key }, financialMutation: true }));
}
export async function revokeQr(request: AuthRequest, id: string) {
  return parseQr(await request(`/api/v1/qr-codes/${encodeURIComponent(id)}/revoke`, { method: "POST", financialMutation: true }));
}
export async function resolveQr(request: AuthRequest, payload: string) {
  if (!paymentPayloadPattern.test(payload)) throw new ApiError("Use an Aries payment QR in the aries:pay:v1 format.", { kind: "validation", code: "INVALID_QR_PAYLOAD" });
  return parseResolvedQr(await request("/api/v1/qr-codes/resolve", { method: "POST", body: JSON.stringify({ payload }) }));
}
export function qrError(error: unknown): string {
  const messages: Record<string, string> = {
    INVALID_QR_PAYLOAD: "Use an Aries payment QR. URLs and OTP authorization codes cannot be used to pay.",
    QR_UNAVAILABLE: "This QR or receiving account is unavailable.", QR_PAID: "This payment request has already been paid.",
    QR_EXPIRED: "This payment request has expired. Ask the recipient for a new QR.", QR_REVOKED: "The recipient revoked this QR.",
    QR_ACCOUNT_EXISTS: "An active account QR already exists. Find it in the list, or revoke it before replacing it.",
    IDEMPOTENCY_CONFLICT: "This request conflicts with a previous attempt. Refresh the QR list before continuing.",
  };
  return error instanceof ApiError && error.code && messages[error.code] || userFacingErrorMessage(error, "The QR result is unconfirmed. Refresh or retry the same request.");
}
