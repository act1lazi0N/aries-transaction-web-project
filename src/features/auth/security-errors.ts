import { ApiError } from "@/lib/api/errors";

export type SecurityFailure = {
  kind: "rejected" | "invalid-token" | "disabled" | "unknown";
  message: string;
  field?: "currentPassword" | "newPassword" | "email";
  retryAfterSeconds?: number;
};

export function securityFailure(cause: unknown): SecurityFailure {
  if (!(cause instanceof ApiError)) return unknownFailure();
  switch (cause.code) {
    case "CURRENT_PASSWORD_INVALID": return { kind: "rejected", field: "currentPassword", message: "Your current password is incorrect." };
    case "PASSWORD_UNCHANGED": return { kind: "rejected", field: "newPassword", message: "Choose a password different from your current password." };
    case "PASSWORD_RESET_TOKEN_INVALID": return { kind: "invalid-token", message: "This reset link is invalid or no longer available. Request a new link." };
    case "FEATURE_DISABLED": return { kind: "disabled", message: "Account security is not available yet. Try again later." };
    case "CSRF_ORIGIN": return { kind: "rejected", message: "This security request was blocked. Open Aries at its usual address and try again. If it continues, contact support." };
  }
  if (cause.status === 429) return { kind: "rejected", message: "Too many requests. Wait before trying again.", retryAfterSeconds: cause.retryAfterSeconds ?? undefined };
  if (cause.status === 401) return { kind: "rejected", message: "Your session has ended. Sign in again to continue." };
  if (cause.status === 403) return { kind: "rejected", message: "You are not allowed to perform this action." };
  if (cause.kind === "validation") {
    const field = ["currentPassword", "newPassword", "email"] as const;
    return { kind: "rejected", message: "Check the entered information and try again.", field: field.find(key => cause.errors?.[key]) };
  }
  return unknownFailure();
}

function unknownFailure(): SecurityFailure {
  return { kind: "unknown", message: "The service did not confirm the outcome. Do not submit this operation again. Sign in normally or request a fresh password reset link." };
}
