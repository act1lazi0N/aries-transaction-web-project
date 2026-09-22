import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { executeErrorDecision, toTransferPreviewRequest, validateTransferAccounts, validateTransferDetails, validateTransferDraft } from "@/features/transfers/validation";

describe("transfer validation", () => {
  it("allows external transfer with one eligible source account", () => {
    const draft = { mode: "EXTERNAL" as const, sourceAccountId: "source-1", recipientAccountNumber: "001122", amount: "1000.00", currency: "VND" as const, description: " Test " };
    expect(validateTransferDraft(draft, new Set(["source-1"]))).toEqual({});
    expect(toTransferPreviewRequest(draft)).toEqual({ mode: "EXTERNAL", sourceAccountId: "source-1", recipientAccountNumber: "001122", amount: "1000.00", currency: "VND", description: "Test" });
  });

  it("requires a second eligible account for own-account transfer", () => {
    const draft = { mode: "OWN_ACCOUNTS" as const, sourceAccountId: "source-1", toAccountId: "source-1", amount: "1000", currency: "VND" as const, description: "" };
    expect(validateTransferDraft(draft, new Set(["source-1"]))).toMatchObject({ toAccountId: expect.any(String) });
  });

  it("validates account and amount steps independently", () => {
    const draft = { mode: "EXTERNAL" as const, sourceAccountId: "source-1", recipientAccountNumber: "001122", amount: "", currency: "VND" as const, description: "" };

    expect(validateTransferAccounts(draft, new Set(["source-1"]))).toEqual({});
    expect(validateTransferDetails(draft)).toMatchObject({ amount: expect.any(String) });
  });

  it("classifies ambiguous and conflicting execute errors safely", () => {
    expect(executeErrorDecision(new ApiError("timeout", { kind: "network" }))).toEqual({ kind: "unknown", requestId: undefined, code: undefined });
    expect(executeErrorDecision(new ApiError("leaky key", { kind: "conflict", code: "IDEMPOTENCY_CONFLICT", requestId: "request-1" }))).toMatchObject({ kind: "rejected", blocked: true, requestId: "request-1" });
  });
});
