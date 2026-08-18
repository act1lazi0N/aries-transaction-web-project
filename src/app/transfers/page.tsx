import { AppShell } from "@/components/app-shell";
import { TransferWorkflow } from "@/features/transfers/components/transfer-workflow";
import { parseAccountSearchParams } from "@/features/accounts/search-params";

export default async function TransfersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseAccountSearchParams(await searchParams);
  return <AppShell><section className="space-y-8"><div><p className="text-sm font-medium text-accent">Transfers</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Send a transfer</h1><p className="mt-3 max-w-2xl text-muted">Review the source, destination, amount, and currency before you send. Your balance changes only after the service confirms the transfer.</p></div><TransferWorkflow initialAccountId={params.accountId} /></section></AppShell>;
}
