import { AppShell } from "@/components/app-shell";
import { TransactionWorkspace } from "@/features/transactions/components/transaction-workspace";
import { parseTransactionSearchParams } from "@/features/transactions/search-params";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseTransactionSearchParams(await searchParams);
  return <AppShell><section className="space-y-8"><div><p className="text-sm font-medium text-accent">Transactions</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Transaction workspace</h1><p className="mt-3 max-w-2xl text-muted">Review backend-authoritative transaction history. Requests and completed outcomes remain visually distinct.</p></div><TransactionWorkspace accountId={params.accountId} page={params.page ?? 0} size={params.size ?? 20} sort={params.sort ?? "createdAt,desc"} /></section></AppShell>;
}
