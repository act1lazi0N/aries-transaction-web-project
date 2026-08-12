import { describe, expect, it } from "vitest";
import { toTransactionLifecycle } from "@/features/transactions/types";

describe("toTransactionLifecycle", () => {
  it("keeps pending distinct from completed", () => {
    expect(toTransactionLifecycle({ status: "PENDING", failureReason: null })).toEqual({ kind: "pending", label: "Pending" });
    expect(toTransactionLifecycle({ status: "COMPLETED", failureReason: null })).toEqual({ kind: "succeeded", label: "Completed" });
  });

  it("preserves backend failure reason", () => {
    expect(toTransactionLifecycle({ status: "FAILED", failureReason: "Insufficient balance" })).toEqual({
      kind: "failed", label: "Failed", reason: "Insufficient balance",
    });
  });

  it("does not invent meaning for an unknown backend status", () => {
    expect(toTransactionLifecycle({ status: "PROCESSING", failureReason: null })).toEqual({ kind: "unknown", label: "Status unavailable" });
  });
});
