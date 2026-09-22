export type BackendTransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "REVERSED" | "REFUNDED" | "PARTIALLY_REFUNDED";
export type TransactionOperation = "TRANSFER" | "REVERSAL" | "REFUND";
export type AccountNumberExposure = "FULL_OWNED" | "MASKED_COUNTERPARTY" | "UNAVAILABLE";
export type TransactionDirection = "INCOMING" | "OUTGOING" | "OWN_ACCOUNTS" | "UNKNOWN";

export type TransactionPartyView = {
  accountNumberDisplay: string | null;
  exposure: AccountNumberExposure;
  displayName: string | null;
  ownedByRequester: boolean;
};

export type Transaction = {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  currency: string;
  status: BackendTransactionStatus | string;
  idempotencyKey: string;
  description: string | null;
  failureReason: string | null;
  originalTransactionId: string | null;
  refundedAmount: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type TransactionRead = Transaction & {
  fromParty: TransactionPartyView;
  toParty: TransactionPartyView;
  direction: TransactionDirection;
};

export type PageResponse<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};

export type TransactionLifecycle =
  | { kind: "pending"; label: "Pending" }
  | { kind: "succeeded"; label: "Completed" }
  | { kind: "failed"; label: "Failed"; reason: string | null }
  | { kind: "reversed"; label: "Reversed" }
  | { kind: "refunded"; label: "Refunded" }
  | { kind: "partially_refunded"; label: "Partially refunded" }
  | { kind: "unknown"; label: "Status unavailable" };

export function toTransactionLifecycle(transaction: Pick<Transaction, "status" | "failureReason">): TransactionLifecycle {
  switch (transaction.status) {
    case "PENDING": return { kind: "pending", label: "Pending" };
    case "COMPLETED": return { kind: "succeeded", label: "Completed" };
    case "FAILED": return { kind: "failed", label: "Failed", reason: transaction.failureReason };
    case "REVERSED": return { kind: "reversed", label: "Reversed" };
    case "REFUNDED": return { kind: "refunded", label: "Refunded" };
    case "PARTIALLY_REFUNDED": return { kind: "partially_refunded", label: "Partially refunded" };
    default: return { kind: "unknown", label: "Status unavailable" };
  }
}
