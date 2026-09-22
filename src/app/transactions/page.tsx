import { AppShell } from "@/components/app-shell";
import { PersonaTransactionWorkspace } from "@/features/transactions/components/persona-transaction-workspace";
import { parseTransactionSearchParams } from "@/features/transactions/search-params";
import { workspaceRoutes } from "@/features/auth/capabilities";
import { ProtectedWorkspace } from "@/features/auth/components/protected-workspace";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseTransactionSearchParams(await searchParams);
  return <ProtectedWorkspace capability={workspaceRoutes.transactions.capability}><AppShell><section className="space-y-8"><div><p className="text-sm font-medium text-accent">Transactions</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Transaction workspace</h1><p className="mt-3 max-w-2xl text-muted">Customers see account history; authorized staff see a global masked explorer. A request is never shown as completed until the service confirms it.</p></div><PersonaTransactionWorkspace accountId={params.accountId} transactionId={params.transactionId} page={params.page ?? 0} size={params.size ?? 20} sort={params.sort ?? "createdAt,desc"} status={params.status} currency={params.currency} from={params.from} to={params.to} /></section></AppShell></ProtectedWorkspace>;
}
