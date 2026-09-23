import { describe, expect, it, vi } from "vitest";
import { createQr, parseQr, parseResolvedQr, resolveQr, type ResolvedQr } from "./api";
import type { AuthRequest } from "@/features/auth/request-types";
import { toTransferPreviewRequest } from "@/features/transfers/validation";

const id = "11111111-1111-4111-8111-111111111111";
const fixed = { id, payload: `aries:pay:v1:${id}`, type: "PAYMENT_REQUEST", state: "ACTIVE", amount: "9999999999999999.99", currency: "VND", description: "Lunch", expiresAt: "2099-01-01T00:00:00Z", createdAt: "2026-09-22T00:00:00Z", transactionId: null };
const resolved = { ...fixed, qrCodeId: id, recipient: { displayName: "Receiver", accountNumberMasked: "******1234" } };
describe("payment QR contract", () => {
  it("keeps exact large money and projects only masked recipient fields", () => {
    expect(parseQr(fixed).amount).toBe("9999999999999999.99");
    const result = parseResolvedQr({ ...resolved, recipient: { ...resolved.recipient, accountId: "private", balance: "1000.00" } });
    expect(result.recipient).toEqual(resolved.recipient);
    expect(result).not.toHaveProperty("transactionId");
  });
  it("rejects numeric money, mismatched payloads, unknown states and fixed requests without expiry", () => {
    for (const patch of [{ amount: 1234 }, { payload: "https://example.com" }, { state: "SUCCESS" }, { expiresAt: null }, { id: "different" }]) expect(() => parseQr({ ...fixed, ...patch })).toThrow();
  });
  it("omits every fixed-value override and manual selector from QR previews", () => {
    const qr = parseResolvedQr(resolved);
    expect(toTransferPreviewRequest({ mode: "QR", qr, sourceAccountId: "mine", amount: "1", description: "tampered", currency: "VND" })).toEqual({ sourceAccountId: "mine", qrCodeId: id });
    const account: ResolvedQr = { ...qr, type: "ACCOUNT", amount: null, description: null, expiresAt: null };
    expect(toTransferPreviewRequest({ mode: "QR", qr: account, sourceAccountId: "mine", amount: "2000.00", description: " Thanks ", currency: "VND" })).toEqual({ sourceAccountId: "mine", qrCodeId: id, amount: "2000.00", description: "Thanks" });
  });
  it("never sends URLs, authorization UUIDs or malformed payment payloads to resolve", async () => {
    const request = vi.fn() as AuthRequest;
    for (const payload of [id, "https://example.com", `aries:pay:v1:${id.toUpperCase()}X`, ""]) await expect(resolveQr(request, payload)).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it("replays QR creation with the same key and exact body", async () => {
    const request = vi.fn().mockResolvedValue(fixed) as AuthRequest;
    const body = { type: "PAYMENT_REQUEST" as const, currency: "VND" as const, amount: "1500.00" };
    await createQr(request, "mine", body, "stable-create-key"); await createQr(request, "mine", body, "stable-create-key");
    expect(vi.mocked(request).mock.calls[0]).toEqual(vi.mocked(request).mock.calls[1]);
    expect(vi.mocked(request).mock.calls[0][1]).toMatchObject({ financialMutation: true, headers: { "Idempotency-Key": "stable-create-key" }, body: JSON.stringify(body) });
  });
});
