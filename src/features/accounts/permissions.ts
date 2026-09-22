import type { Transaction } from "@/features/transactions/types";
import { hasCapability, normalizeRole } from "@/features/auth/capabilities";

type TransactionPermissionInput = {
  role?: string | null;
  ownedAccountIds?: ReadonlySet<string>;
};

export function transactionCapabilities(transaction: Transaction, { role, ownedAccountIds = new Set<string>() }: TransactionPermissionInput) {
  const normalizedRole = normalizeRole(role);
  const canReverse = transaction.status === "COMPLETED" && hasCapability(normalizedRole, "transactions:reverse");
  const refundable = transaction.status === "COMPLETED" || transaction.status === "PARTIALLY_REFUNDED";
  const canRefund = refundable && hasCapability(normalizedRole, "transactions:refund") && (normalizedRole === "OPERATOR" || normalizedRole === "MERCHANT" && ownedAccountIds.has(transaction.toAccountId));
  return { canReverse, canRefund } as const;
}
