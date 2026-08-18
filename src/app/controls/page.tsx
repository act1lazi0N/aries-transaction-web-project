import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { ReconciliationWorkspace } from "@/features/controls/components/reconciliation-workspace";
import { ReconciliationHistoryUnavailable } from "@/features/controls/components/reconciliation-history";
import { parseControlSearchParams } from "@/features/controls/search-params";

export default async function ControlsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseControlSearchParams(await searchParams);
  return <AppShell><AuthGate><section className="space-y-8"><div><p className="text-sm font-medium text-accent">Controls</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Operational controls</h1><p className="mt-3 max-w-2xl text-muted">Run reconciliation checks and review exceptions returned by the service. Nothing is marked as changed unless the service confirms it.</p></div><ReconciliationHistoryUnavailable /><ReconciliationWorkspace key={params.runId ?? "new"} initialRunId={params.runId} /></section></AuthGate></AppShell>;
}
