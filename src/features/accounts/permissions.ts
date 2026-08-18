import type { Transaction } from "@/features/transactions/types";

type TransactionPermissionInput = {
  role?: string | null;
  ownedAccountIds?: ReadonlySet<string>;
};

export function transactionCapabilities(transaction: Transaction, { role, ownedAccountIds = new Set<string>() }: TransactionPermissionInput) {
  const normalizedRole = role?.toUpperCase();
  const canReverse = transaction.status === "COMPLETED" && (normalizedRole === "OPERATOR" || normalizedRole === "ADMIN");
  const refundable = transaction.status === "COMPLETED" || transaction.status === "PARTIALLY_REFUNDED";
  const canRefund = refundable && (normalizedRole === "OPERATOR" || normalizedRole === "MERCHANT" && ownedAccountIds.has(transaction.toAccountId));
  return { canReverse, canRefund } as const;
}
