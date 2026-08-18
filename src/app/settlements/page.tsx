import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { SettlementWorkspace } from "@/features/settlements/components/settlement-workspace";
import { parseSettlementSearchParams } from "@/features/settlements/search-params";

export default async function SettlementsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseSettlementSearchParams(await searchParams);
  return <AppShell><AuthGate><section className="space-y-8"><div><p className="text-sm font-medium text-accent">Settlements</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Settlement operations</h1><p className="mt-3 max-w-2xl text-muted">Review confirmed settlement batches. New execution remains unavailable until the service exposes a safe preview.</p></div><SettlementWorkspace initialBatchId={params.batchId} /></section></AuthGate></AppShell>;
}
