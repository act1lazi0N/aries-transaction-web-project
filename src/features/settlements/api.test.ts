import { describe, expect, it } from "vitest";
import { parseSettlementBatch } from "@/features/settlements/api";

const batch = {
  id: "batch-1",
  currency: "VND",
  grossAmount: "1000000000000000000.000000000000000001",
  feeAmount: "20000000000000000.000000000000000000",
  netAmount: "980000000000000000.000000000000000001",
  feeRateBps: 200,
  idempotencyKey: "settlement-key-1",
  cutoffCompletedAt: "2026-08-18T00:00:00Z",
  status: "PENDING",
  createdAt: "2026-08-18T00:01:00Z",
  items: [{
    id: "item-1", transactionId: "tx-1", receiverAccountId: "account-1",
    grossAmount: "1000000000000000000.000000000000000001", feeAmount: "20000000000000000",
    netAmount: "980000000000000000.000000000000000001", platformRevenue: "20000000000000000",
    receiverPayable: "980000000000000000.000000000000000001", itemType: "NORMAL", currency: "VND", payoutStatus: "PENDING",
  }],
};

describe("parseSettlementBatch", () => {
  it("preserves exact settlement money strings", () => {
    expect(parseSettlementBatch(batch).grossAmount).toBe(batch.grossAmount);
    expect(parseSettlementBatch(batch).items[0]?.netAmount).toBe(batch.items[0].netAmount);
  });

  it("rejects malformed settlement contracts", () => {
    expect(() => parseSettlementBatch({ ...batch, feeRateBps: "200" })).toThrow("invalid fee rate");
  });
});
