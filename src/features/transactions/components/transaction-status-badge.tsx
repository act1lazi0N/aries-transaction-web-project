import { Badge } from "@/components/ui/badge";
import { toTransactionLifecycle, type Transaction } from "@/features/transactions/types";

export function TransactionStatusBadge({ transaction }: { transaction: Pick<Transaction, "status" | "failureReason"> }) {
  const lifecycle = toTransactionLifecycle(transaction);
  const tone = lifecycle.kind === "succeeded" ? "success" : lifecycle.kind === "failed" || lifecycle.kind === "reversed" ? "danger" : lifecycle.kind === "pending" ? "pending" : lifecycle.kind === "unknown" ? "warning" : "neutral";
  return <Badge tone={tone}>{lifecycle.label}</Badge>;
}
