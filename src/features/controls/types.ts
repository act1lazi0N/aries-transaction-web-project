export type ReconciliationRunStatus = "RUNNING" | "COMPLETED" | "FAILED";

export type ReconciliationExceptionType =
  | "MISSING_IN_REPORTING"
  | "DUPLICATE_IN_REPORTING"
  | "UNEXPECTED_IN_REPORTING"
  | "AMOUNT_MISMATCH"
  | "STATUS_MISMATCH";

export type ReconciliationRequest = {
  currency: string;
  windowStart: string;
  windowEnd: string;
};

export type ReconciliationException = {
  id: string;
  exceptionType: string;
  transactionId: string;
  sourceAmount: string;
  reportingAmount: string;
  sourceStatus: string;
  reportingStatus: string;
  details: string;
  createdAt: string;
};

export type ReconciliationRun = {
  id: string;
  currency: string;
  windowStart: string;
  windowEnd: string;
  status: string;
  sourceCount: number;
  reportingCount: number;
  exceptionCount: number;
  createdAt: string;
  completedAt: string | null;
  exceptions: ReconciliationException[];
};

export type ReconciliationLifecycle =
  | { kind: "running"; label: "Running" }
  | { kind: "completed"; label: "Completed" }
  | { kind: "failed"; label: "Failed" }
  | { kind: "unknown"; label: "Status unavailable" };

export function toReconciliationLifecycle(status: string): ReconciliationLifecycle {
  switch (status) {
    case "RUNNING": return { kind: "running", label: "Running" };
    case "COMPLETED": return { kind: "completed", label: "Completed" };
    case "FAILED": return { kind: "failed", label: "Failed" };
    default: return { kind: "unknown", label: "Status unavailable" };
  }
}
