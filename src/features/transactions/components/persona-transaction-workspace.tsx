"use client";

import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { StaffTransactionWorkspace } from "@/features/operations/components/staff-transaction-workspace";
import { TransactionWorkspace } from "@/features/transactions/components/transaction-workspace";

type Props = { accountId?: string; transactionId?: string; page: number; size: number; sort: string; status?: string; currency?: string; from?: string; to?: string };
export function PersonaTransactionWorkspace(props: Props) {
  const role = useAuthSession().user?.role;
  return role === "OPERATOR" || role === "ADMIN" ? <StaffTransactionWorkspace initialFilters={{ transactionId: props.transactionId, status: props.status, currency: props.currency, from: props.from, to: props.to, page: props.page, size: props.size }} /> : <TransactionWorkspace accountId={props.accountId} transactionId={props.transactionId} page={props.page} size={props.size} sort={props.sort} />;
}
