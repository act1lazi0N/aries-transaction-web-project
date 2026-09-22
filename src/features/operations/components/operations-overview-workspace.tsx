"use client";

import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatStrip } from "@/components/ui/stat-strip";
import { Tabs } from "@/components/ui/tabs";
import { ErrorState, StatusBanner, WorkspaceSkeleton } from "@/components/ui/workspace-state";
import { useOperationsOverview } from "@/features/operations/queries";

const ranges = ["24h", "7d", "30d"] as const;

export function OperationsOverviewWorkspace({ initialRange }: { initialRange?: string }) {
  const router = useRouter(); const pathname = usePathname();
  const range = ranges.includes(initialRange as typeof ranges[number]) ? initialRange! : "24h";
  const query = useOperationsOverview(range);
  if (query.isPending) return <WorkspaceSkeleton label="Loading operations overview" />;
  if (query.isError && !query.data) return <ErrorState title="Operations health is unavailable" detail="Aries cannot confirm customer, transaction, settlement, reconciliation, or ledger health." onRetry={() => void query.refetch()} />;
  if (!query.data) return null;
  const data = query.data;
  return <div className="space-y-7"><header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-sm font-semibold text-accent">Operations</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">System health, without invented certainty.</h1><p className="mt-3 max-w-2xl leading-7 text-muted">Customer access, processing exceptions, settlements, reconciliation, and ledger invariants from confirmed service data.</p></div><div className="flex items-center gap-2"><Tabs label="Operations range" value={range} onValueChange={value => router.replace(`${pathname}?range=${value}` as Route, { scroll: false })} items={ranges.map(value => ({ value, label: value.toUpperCase() }))} /><Button variant="ghost" aria-label="Refresh operations overview" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw aria-hidden="true" size={17} className={query.isFetching ? "animate-spin" : ""} /></Button></div></header>{query.isError && <StatusBanner tone="warning" title="Refresh unavailable">Showing the last confirmed snapshot.</StatusBanner>}<StatStrip items={[{ label: "Active customers", value: String(data.customers.active) }, { label: "Suspended", value: String(data.customers.suspended), tone: data.customers.suspended ? "warning" : "neutral" }, { label: "Pending transactions", value: String(data.transactions.pending), tone: data.transactions.pending ? "warning" : "neutral" }, { label: "Ledger invariant", value: data.ledger.healthy ? "Healthy" : "Attention", tone: data.ledger.healthy ? "success" : "danger" }]} /><div className="grid gap-4 lg:grid-cols-3"><HealthPanel title="Customer access" status={`${data.customers.users} users · ${data.customers.merchants} merchants`} rows={[['Active', data.customers.active], ['Suspended', data.customers.suspended]]} /><HealthPanel title="Reconciliation" status={`${data.reconciliation.runs} runs`} rows={[['Exceptions', data.reconciliation.exceptions], ['Failed transactions', data.transactions.failed]]} /><HealthPanel title="Settlement & ledger" status={`${data.settlements.batches} batches`} rows={[['Pending batches', data.settlements.pending], ['Unbalanced journals', data.ledger.unbalancedJournals]]} danger={data.ledger.unbalancedJournals > 0} /></div></div>;
}
function HealthPanel({ title, status, rows, danger = false }: { title: string; status: string; rows: [string, number][]; danger?: boolean }) { return <section className="rounded-2xl border border-border bg-surface p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{title}</h2><Badge tone={danger ? "danger" : "neutral"}>{danger ? "Attention" : "Confirmed"}</Badge></div><p className="mt-2 text-sm text-muted">{status}</p><dl className="mt-6 space-y-3">{rows.map(([label, value]) => <div key={label} className="flex justify-between border-t border-border pt-3 text-sm"><dt className="text-muted">{label}</dt><dd className="font-mono font-semibold">{value}</dd></div>)}</dl></section>; }
