import { AppShell } from "@/components/app-shell";
import { TransactionWorkspace } from "@/features/transactions/components/transaction-workspace";
import { parseTransactionSearchParams } from "@/features/transactions/search-params";
import { workspaceRoutes } from "@/features/auth/capabilities";
import { ProtectedWorkspace } from "@/features/auth/components/protected-workspace";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseTransactionSearchParams(await searchParams);
  return <ProtectedWorkspace capability={workspaceRoutes.transactions.capability}><AppShell><section className="space-y-8"><div><p className="text-sm font-medium text-accent">Transactions</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Transaction workspace</h1><p className="mt-3 max-w-2xl text-muted">Review your transaction history with clear statuses. A request is never shown as completed until the service confirms it.</p></div><TransactionWorkspace accountId={params.accountId} transactionId={params.transactionId} page={params.page ?? 0} size={params.size ?? 20} sort={params.sort ?? "createdAt,desc"} /></section></AppShell></ProtectedWorkspace>;
}
