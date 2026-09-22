import { afterEach, describe, expect, it, vi } from "vitest";
import { changePassword, forgotPassword, logoutAll, resetPassword } from "@/features/auth/security-api";
import { newPasswordError } from "@/features/auth/password-policy";
import { securityFailure } from "@/features/auth/security-errors";
import { ApiError } from "@/lib/api/errors";

afterEach(() => vi.unstubAllGlobals());

describe("account security contracts", () => {
  it.each([8, 72])("accepts %i ASCII bytes and preserves password whitespace", length => {
    expect(newPasswordError("a".repeat(length))).toBeNull();
    expect(newPasswordError("  sample-password  ")).toBeNull();
  });
  it("checks UTF-8 bytes independently from string length", () => {
    expect(newPasswordError("🔑".repeat(18))).toBeNull();
    expect(newPasswordError("🔑".repeat(19))).toBeTruthy();
    expect(newPasswordError(" ".repeat(8))).toBeTruthy();
    // Java Character.isWhitespace excludes non-breaking spaces.
    expect(newPasswordError("\u00a0".repeat(8))).toBeNull();
    expect(newPasswordError("a".repeat(7))).toBeTruthy();
  });
  it("sends public recovery requests without Authorization or confirmation", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ success: true, data: null }), { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    await forgotPassword({ email: "user@example.com" });
    await resetPassword({ token: "Case-Sensitive-Link", newPassword: "  new-password  " });
    expect(fetchMock.mock.calls[0][0]).toContain("/auth/forgot-password");
    const options = fetchMock.mock.calls[1][1] as RequestInit;
    expect(options.body).toBe(JSON.stringify({ token: "Case-Sensitive-Link", newPassword: "  new-password  " }));
    expect(new Headers(options.headers).has("Authorization")).toBe(false);
    expect(options.credentials).toBe("include");
    expect(options.cache).toBe("no-store");
  });
  it("sends authenticated security operations without user IDs or replay", async () => {
    const request = vi.fn().mockResolvedValue(null);
    await changePassword({ currentPassword: "old-password", newPassword: "new-password" }, request);
    await logoutAll(request);
    expect(request).toHaveBeenNthCalledWith(1, "/api/v1/auth/change-password", expect.objectContaining({ method: "POST", body: JSON.stringify({ currentPassword: "old-password", newPassword: "new-password" }) }));
    expect(request).toHaveBeenNthCalledWith(2, "/api/v1/auth/logout-all", { method: "POST", cache: "no-store" });
  });
  it.each(["network", "server", "unknown"] as const)("preserves unknown outcomes for %s failures", kind => {
    expect(securityFailure(new ApiError("unsafe server detail", { kind })).kind).toBe("unknown");
  });
  it("distinguishes feature disabled and rate limits without inventing a countdown", () => {
    expect(securityFailure(new ApiError("disabled", { kind: "server", status: 503, code: "FEATURE_DISABLED" })).kind).toBe("disabled");
    expect(securityFailure(new ApiError("limited", { kind: "rate_limited", status: 429 })).retryAfterSeconds).toBeUndefined();
  });
});
