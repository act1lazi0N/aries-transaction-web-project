"use client";

import { AlertTriangle, Clock3, ExternalLink, RefreshCw, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/features/accounts/format";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { useSettlementBatch } from "@/features/settlements/queries";
import { toSettlementLifecycle, type SettlementBatch, type SettlementItem } from "@/features/settlements/types";
import { ApiError } from "@/lib/api/errors";

export function SettlementWorkspace({ initialBatchId }: { initialBatchId?: string }) {
  const session = useAuthSession();
  const router = useRouter();
  const [batchId, setBatchId] = useState(initialBatchId ?? "");
  const query = useSettlementBatch(initialBatchId);
  const canOperate = ["OPERATOR", "ADMIN"].includes(session.user?.role.toUpperCase() ?? "");

  function openBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = batchId.trim();
    router.replace(next ? `/settlements?batchId=${encodeURIComponent(next)}` as Route : "/settlements" as Route);
  }

  if (!canOperate) return <PermissionDenied />;
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
    <section aria-labelledby="settlement-request-title" className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-start gap-3"><ShieldAlert aria-hidden="true" className="mt-0.5 text-[var(--aries-warning)]" size={19} /><div><h2 id="settlement-request-title" className="text-lg font-semibold">Settlement control center</h2><p className="mt-2 text-sm leading-6 text-muted">Open a previously created settlement batch and review its confirmed totals.</p></div></div>
      <form onSubmit={openBatch} className="mt-6 space-y-4"><label htmlFor="settlement-batch-id" className="block text-sm font-medium">Settlement batch ID<input id="settlement-batch-id" value={batchId} onChange={event => setBatchId(event.target.value)} placeholder="Paste a batch ID" className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 font-mono text-sm outline-none focus:border-accent" /></label><Button type="submit" disabled={!batchId.trim()}>Open batch <ExternalLink aria-hidden="true" size={16} /></Button></form>
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-[var(--aries-warning)]"><p className="font-medium">Settlement execution is paused</p><p className="mt-1 leading-6">The service does not yet provide a preview with gross amount, fee, net amount, and candidate count before submission. Creating a batch is intentionally unavailable until that contract exists.</p></div>
    </section>
    <BatchPanel query={query} />
  </div>;
}

function BatchPanel({ query }: { query: ReturnType<typeof useSettlementBatch> }) {
  if (!query.isLoading && !query.data && !query.error) return <section aria-labelledby="settlement-empty-title" className="rounded-2xl border border-dashed border-border bg-surface p-8"><p id="settlement-empty-title" className="font-medium">No settlement batch selected</p><p className="mt-2 text-sm leading-6 text-muted">Enter a batch ID to inspect service-confirmed settlement totals and payout items.</p></section>;
  if (query.isLoading && !query.data) return <section role="status" aria-label="Loading settlement batch" className="rounded-2xl border border-border bg-surface p-8"><div className="h-5 w-44 animate-pulse rounded bg-surface-muted" /><div className="mt-6 h-36 animate-pulse rounded-xl bg-surface-muted" /></section>;
  if (query.error && !query.data) return <section role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6"><div className="flex gap-3"><AlertTriangle aria-hidden="true" className="mt-0.5 text-[var(--aries-danger)]" size={18} /><div><p className="font-medium text-[var(--aries-danger)]">We could not load this settlement batch</p><p className="mt-1 text-sm text-muted">{query.error instanceof ApiError && (query.error.kind === "forbidden" || query.error.kind === "unauthorized") ? "You do not have permission to view this batch." : "The batch status is unavailable. We will not guess its outcome."}</p><Button type="button" variant="secondary" className="mt-4" onClick={() => void query.refetch()}>Try again</Button></div></div></section>;
  return <SettlementBatchResult batch={query.data!} isFetching={query.isFetching} onRetry={() => void query.refetch()} />;
}

function SettlementBatchResult({ batch, isFetching, onRetry }: { batch: SettlementBatch; isFetching: boolean; onRetry: () => void }) {
  const lifecycle = toSettlementLifecycle(batch.status);
  const tone = lifecycle.kind === "paid" ? "success" : lifecycle.kind === "failed" || lifecycle.kind === "cancelled" ? "danger" : lifecycle.kind === "unknown" ? "warning" : "pending";
  return <section aria-labelledby="settlement-result-title" className="rounded-2xl border border-border bg-surface p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-medium text-accent">Confirmed settlement data</p><h2 id="settlement-result-title" className="mt-1 text-xl font-semibold">Settlement batch</h2></div><Badge tone={tone}>{lifecycle.label}</Badge></div><div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted"><span className="break-all font-mono">Batch {batch.id}</span>{isFetching && <span role="status" className="inline-flex items-center gap-1"><RefreshCw aria-hidden="true" size={13} className="animate-spin" />Updating</span>}<Button type="button" variant="ghost" className="min-h-7 px-2" onClick={onRetry}>Refresh</Button></div><dl className="mt-6 grid gap-3 sm:grid-cols-3"><MoneyMetric label="Gross amount" value={formatMoney(batch.grossAmount, batch.currency)} /><MoneyMetric label="Fee amount" value={formatMoney(batch.feeAmount, batch.currency)} /><MoneyMetric label="Net amount" value={formatMoney(batch.netAmount, batch.currency)} /></dl><dl className="mt-6 grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-3"><Info label="Currency" value={batch.currency} /><Info label="Fee rate" value={`${batch.feeRateBps} bps`} /><Info label="Cutoff" value={formatDate(batch.cutoffCompletedAt)} /></dl>{(lifecycle.kind === "pending" || lifecycle.kind === "processing") && <p role="status" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-[var(--aries-warning)]">This batch is still being processed. We will not show it as paid until the service confirms payment.</p>}{lifecycle.kind === "unknown" && <p role="alert" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-[var(--aries-warning)]">The service returned a status we do not recognize. No successful outcome is inferred.</p>}<SettlementItems items={batch.items} currency={batch.currency} /></section>;
}

function SettlementItems({ items, currency }: { items: SettlementItem[]; currency: string }) {
  return <section aria-labelledby="settlement-items-title" className="mt-8"><div className="flex items-center justify-between gap-3"><div><h3 id="settlement-items-title" className="font-semibold">Payout items</h3><p className="mt-1 text-sm text-muted">{items.length} item{items.length === 1 ? "" : "s"} returned by the service.</p></div></div>{items.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">No payout items were returned.</div> : <div className="mt-4 overflow-x-auto rounded-xl border border-border"><table className="w-full text-sm"><thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Transaction</th><th className="px-4 py-3">Gross</th><th className="px-4 py-3">Fee</th><th className="px-4 py-3">Net</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{items.map(item => <tr key={item.id} className="border-b border-border last:border-0"><td className="break-all px-4 py-3 font-mono text-xs">{item.transactionId}</td><td className="px-4 py-3 font-mono tabular-nums">{formatMoney(item.grossAmount, currency)}</td><td className="px-4 py-3 font-mono tabular-nums">{formatMoney(item.feeAmount, currency)}</td><td className="px-4 py-3 font-mono tabular-nums">{formatMoney(item.netAmount, currency)}</td><td className="px-4 py-3"><Badge tone={payoutTone(item.payoutStatus)}>{payoutLabel(item.payoutStatus)}</Badge></td></tr>)}</tbody></table></div>}</section>;
}

function payoutTone(status: string): "neutral" | "success" | "warning" | "danger" | "pending" {
  switch (status) {
    case "PAID": return "success";
    case "FAILED": return "danger";
    case "PROCESSING": return "pending";
    case "PENDING": return "warning";
    default: return "neutral";
  }
}

function payoutLabel(status: string) {
  switch (status) {
    case "PAID": return "Paid";
    case "FAILED": return "Failed";
    case "PROCESSING": return "Processing";
    case "PENDING": return "Pending";
    default: return "Status unavailable";
  }
}

function PermissionDenied() { return <section role="alert" className="rounded-2xl border border-border bg-surface p-8"><div className="flex gap-3"><ShieldAlert aria-hidden="true" className="mt-0.5 text-[var(--aries-danger)]" size={19} /><div><h2 className="font-semibold">You do not have access to settlements</h2><p className="mt-2 text-sm leading-6 text-muted">Settlement controls are available only to authorized operations users.</p></div></div></section>; }
function MoneyMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-surface-muted p-4"><dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt><dd className="mt-2 font-mono text-xl font-semibold tabular-nums">{value}</dd></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-muted">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date); }
