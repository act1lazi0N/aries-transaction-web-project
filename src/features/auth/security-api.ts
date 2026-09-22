import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { AuthRequest } from "@/features/auth/request-types";

export type ForgotPasswordRequest = { email: string };
export type ResetPasswordRequest = { token: string; newPassword: string };
export type ChangePasswordRequest = { currentPassword: string; newPassword: string };

function confirmed(value: unknown): null {
  if (value !== null) throw new ApiError("The service did not confirm the operation", { kind: "unknown" });
  return null;
}

export function forgotPassword(input: ForgotPasswordRequest) {
  return apiRequest<unknown>("/api/v1/auth/forgot-password", { method: "POST", body: JSON.stringify(input), cache: "no-store" }).then(confirmed);
}

export function resetPassword(input: ResetPasswordRequest) {
  return apiRequest<unknown>("/api/v1/auth/reset-password", { method: "POST", body: JSON.stringify(input), cache: "no-store" }).then(confirmed);
}

export function changePassword(input: ChangePasswordRequest, request: AuthRequest) {
  return request<unknown>("/api/v1/auth/change-password", { method: "POST", body: JSON.stringify(input), cache: "no-store" }).then(confirmed);
}

export function logoutAll(request: AuthRequest) {
  return request<unknown>("/api/v1/auth/logout-all", { method: "POST", cache: "no-store" }).then(confirmed);
}
