export type SettlementBatchStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED" | string;
export type PayoutStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | string;
export type SettlementItemType = "NORMAL" | "ADJUSTMENT" | string;

export type SettlementItem = {
  id: string;
  transactionId: string;
  receiverAccountId: string;
  grossAmount: string;
  feeAmount: string;
  netAmount: string;
  platformRevenue: string;
  receiverPayable: string;
  itemType: SettlementItemType;
  currency: string;
  payoutStatus: PayoutStatus;
};

export type SettlementBatch = {
  id: string;
  currency: string;
  grossAmount: string;
  feeAmount: string;
  netAmount: string;
  feeRateBps: number;
  idempotencyKey: string;
  cutoffCompletedAt: string;
  status: SettlementBatchStatus;
  createdAt: string;
  items: SettlementItem[];
};

export type SettlementLifecycle =
  | { kind: "pending"; label: "Pending" }
  | { kind: "processing"; label: "Processing" }
  | { kind: "paid"; label: "Paid" }
  | { kind: "failed"; label: "Failed" }
  | { kind: "cancelled"; label: "Cancelled" }
  | { kind: "unknown"; label: "Status unavailable" };

export function toSettlementLifecycle(status: string): SettlementLifecycle {
  switch (status) {
    case "PENDING": return { kind: "pending", label: "Pending" };
    case "PROCESSING": return { kind: "processing", label: "Processing" };
    case "PAID": return { kind: "paid", label: "Paid" };
    case "FAILED": return { kind: "failed", label: "Failed" };
    case "CANCELLED": return { kind: "cancelled", label: "Cancelled" };
    default: return { kind: "unknown", label: "Status unavailable" };
  }
}
