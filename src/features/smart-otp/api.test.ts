import { describe, expect, it, vi } from "vitest";
import { parseAuthorization, verifyAuthorization } from "./api";
import type { AuthRequest } from "@/features/auth/request-types";
import { parseTransferPreview } from "@/features/transfers/api";
const challenge = { id: "authorization", deviceId: "device", purpose: "TRANSFER", suite: "OCRA-1:HOTP-SHA256-8:QH64", state: "VERIFIED", expiresAt: "2099-01-01T00:00:00Z", payloadBase64: "private-challenge" };
describe("Smart OTP contract", () => {
  it("does not retain challenge payload bytes on web", () => { expect(parseAuthorization(challenge)).not.toHaveProperty("payloadBase64"); });
  it("rejects another purpose or unknown state", () => { expect(() => parseAuthorization({ ...challenge, purpose: "ENROLLMENT" })).toThrow(); expect(() => parseAuthorization({ ...challenge, state: "OK" })).toThrow(); });
  it("keeps leading zeroes and marks verification as a non-replayed mutation", async () => {
    const request = vi.fn().mockResolvedValue(challenge) as AuthRequest;
    await verifyAuthorization(request, "authorization", "00123456");
    expect(vi.mocked(request).mock.calls[0][1]).toMatchObject({ body: '{"otp":"00123456"}', financialMutation: true });
  });
  it("fails closed if an otherwise valid preview omits its authorization policy", () => {
    const preview = { previewId: "p", expiresAt: challenge.expiresAt, source: { displayName: "Mine", accountNumberMasked: "***1" }, recipient: { displayName: "Other", accountNumberMasked: "***2" }, amount: "1500.00", fee: "0.00", debitTotal: "1500.00", currency: "VND", warnings: [] };
    expect(() => parseTransferPreview(preview)).toThrow();
    expect(() => parseTransferPreview({ ...preview, authorizationRequirement: "NONE", enrollmentState: "UNAVAILABLE" })).not.toThrow();
    expect(() => parseTransferPreview({ ...preview, authorizationRequirement: "UNKNOWN", enrollmentState: "ACTIVE" })).toThrow();
  });
});
