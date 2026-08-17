import { afterEach, describe, expect, it, vi } from "vitest";
import { createReconciliationRun, parseReconciliationRun, reconciliationPaths } from "@/features/controls/api";

const run = {
  id: "run-1",
  currency: "VND",
  windowStart: "2026-08-17T00:00:00Z",
  windowEnd: "2026-08-17T01:00:00Z",
  status: "COMPLETED",
  sourceCount: 2,
  reportingCount: 2,
  exceptionCount: 1,
  createdAt: "2026-08-17T01:00:00Z",
  completedAt: "2026-08-17T01:00:01Z",
  exceptions: [{ id: "ex-1", exceptionType: "AMOUNT_MISMATCH", transactionId: "tx-1", sourceAmount: "1000.000000000000001", reportingAmount: "1000", sourceStatus: "COMPLETED", reportingStatus: "COMPLETED", details: "Amount mismatch", createdAt: "2026-08-17T01:00:00Z" }],
};

afterEach(() => vi.unstubAllGlobals());

describe("reconciliation API", () => {
  it("preserves exact exception amounts at the contract boundary", () => {
    expect(parseReconciliationRun(run).exceptions[0]?.sourceAmount).toBe("1000.000000000000001");
  });

  it("uses the protected create endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, message: "created", data: run }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(createReconciliationRun({ currency: "VND", windowStart: run.windowStart, windowEnd: run.windowEnd })).resolves.toEqual(run);
    expect(reconciliationPaths.runs).toBe("/api/v1/reconciliation/runs");
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/v1/reconciliation/runs", expect.objectContaining({ method: "POST", credentials: "include" }));
  });

  it("rejects malformed status counts", () => {
    expect(() => parseReconciliationRun({ ...run, sourceCount: -1 })).toThrow("invalid source count");
  });
});
