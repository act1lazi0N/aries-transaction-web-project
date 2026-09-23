import type { AuthRequest } from "@/features/auth/request-types";
import { enumeration, nullableText, record, text, timestamp } from "@/features/qr/api";
import { ApiError, userFacingErrorMessage } from "@/lib/api/errors";

export const enrollmentStates = ["UNAVAILABLE", "NOT_ENROLLED", "ACTIVE", "RECOVERY_REQUIRED"] as const;
export type EnrollmentState = typeof enrollmentStates[number];
export type OtpStatus = { mode: "DISABLED" | "ENROLLMENT_ONLY" | "ENFORCED"; enrollmentState: EnrollmentState; deviceId: string | null };
export type Authorization = { id: string; deviceId: string; purpose: "TRANSFER"; suite: "OCRA-1:HOTP-SHA256-8:QH64"; state: "PENDING" | "VERIFIED" | "CONSUMED" | "EXPIRED" | "LOCKED" | "REVOKED"; expiresAt: string };
export function parseAuthorization(input: unknown): Authorization {
  const value = record(input);
  // The web needs the reference/state only. Do not retain payloadBase64 in a query cache.
  return { id: text(value.id), deviceId: text(value.deviceId), purpose: enumeration(value.purpose, ["TRANSFER"]), suite: enumeration(value.suite, ["OCRA-1:HOTP-SHA256-8:QH64"]), state: enumeration(value.state, ["PENDING", "VERIFIED", "CONSUMED", "EXPIRED", "LOCKED", "REVOKED"]), expiresAt: timestamp(value.expiresAt) };
}
export async function readOtpStatus(request: AuthRequest): Promise<OtpStatus> {
  const value = record(await request("/api/v1/auth/smart-otp/status", { cache: "no-store" }));
  return { mode: enumeration(value.mode, ["DISABLED", "ENROLLMENT_ONLY", "ENFORCED"]), enrollmentState: enumeration(value.enrollmentState, enrollmentStates), deviceId: nullableText(value.deviceId) };
}
export async function createAuthorization(request: AuthRequest, previewId: string, idempotencyKey: string) {
  return parseAuthorization(await request("/api/v1/transfers/authorizations", { method: "POST", body: JSON.stringify({ previewId, idempotencyKey }), financialMutation: true }));
}
export async function readAuthorization(request: AuthRequest, id: string) {
  return parseAuthorization(await request(`/api/v1/transfers/authorizations/${encodeURIComponent(id)}`, { cache: "no-store" }));
}
export async function verifyAuthorization(request: AuthRequest, id: string, otp: string) {
  return parseAuthorization(await request(`/api/v1/transfers/authorizations/${encodeURIComponent(id)}/verify`, { method: "POST", body: JSON.stringify({ otp }), financialMutation: true }));
}
export function otpError(error: unknown) {
  const messages: Record<string, string> = {
    SMART_OTP_INVALID: "The code was not accepted. Check the transaction in your Aries app and enter its eight-digit code.",
    SMART_OTP_LOCKED: "Verification is locked. Wait for any cooldown, then create a new preview.",
    SMART_OTP_EXPIRED: "Verification expired. Create a new preview and review the transfer again.",
    SMART_OTP_DEVICE_REVOKED: "The device was revoked. Check Smart OTP in your Aries app.",
    SMART_OTP_ENROLLMENT_REQUIRED: "Set up Smart OTP in your Aries app, then create a new preview.",
    SMART_OTP_RECOVERY_REQUIRED: "Recover Smart OTP in your Aries app, then create a new preview.",
    SMART_OTP_BINDING_CONFLICT: "This proof does not match the transfer. Create a new preview.",
    SMART_OTP_CONSUMED: "This authorization was already used. Check the transfer status.",
    SMART_OTP_NOT_FOUND: "This authorization is unavailable. Review your session and create a new preview.",
    SMART_OTP_UNAVAILABLE: "Smart OTP is unavailable. Try again when the service is responding.",
    EMAIL_VERIFICATION_REQUIRED: "Verify your email before setting up Smart OTP in the app.",
  };
  return error instanceof ApiError && error.code && messages[error.code] || userFacingErrorMessage(error, "Verification could not be confirmed. Check its status before entering another code.");
}
export function uncertain(error: unknown) { return !(error instanceof ApiError) || ["network", "server", "unknown"].includes(error.kind); }
