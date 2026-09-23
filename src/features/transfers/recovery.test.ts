import { beforeEach, describe, expect, it } from "vitest";
import { clearTransferRecovery, readTransferRecovery, saveTransferRecovery } from "./recovery";
import { executeErrorDecision } from "./validation";
import { ApiError } from "@/lib/api/errors";

const request = { previewId: "old-preview", idempotencyKey: "stable-key-123456789", authorizationId: "old-authorization" };
describe("same-tab transfer recovery", () => {
  beforeEach(() => sessionStorage.clear());
  it("persists only replay references and survives an expired local deadline", () => {
    saveTransferRecovery("owner", { ...request, otp: "00123456", recipient: "private", expiresAt: "2020-01-01" } as typeof request);
    expect(JSON.parse(sessionStorage.getItem("aries.transfer-recovery.v1")!)).toEqual({ version: 1, userId: "owner", ...request });
    expect(readTransferRecovery("owner")).toEqual({ version: 1, userId: "owner", ...request });
  });
  it("does not overwrite an unresolved operation with a different preview or key", () => {
    saveTransferRecovery("owner", request);
    expect(() => saveTransferRecovery("owner", { ...request, previewId: "new-preview" })).toThrow();
    expect(readTransferRecovery("owner")?.previewId).toBe("old-preview");
    expect(() => saveTransferRecovery("owner", request)).not.toThrow();
  });
  it("clears another user's data and supports explicit session cleanup", () => {
    saveTransferRecovery("owner", request); expect(readTransferRecovery("other-user")).toBeNull();
    expect(sessionStorage.length).toBe(0);
    saveTransferRecovery("owner", request); clearTransferRecovery(); expect(readTransferRecovery("owner")).toBeNull();
  });
  it("does not mistake malformed success, rate limits or authentication rejection for proof of no prior debit", () => {
    for (const kind of ["unknown", "rate_limited", "unauthorized", "forbidden", "server", "network"] as const) expect(executeErrorDecision(new ApiError("unconfirmed", { kind })).kind).toBe("unknown");
    expect(executeErrorDecision(new ApiError("storage", { kind: "conflict", code: "RECOVERY_UNAVAILABLE" }))).toMatchObject({ kind: "rejected", blocked: true });
  });
});
