"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorState, WorkspaceSkeleton } from "@/components/ui/workspace-state";
import { formatMoney } from "@/features/accounts/format";
import { useSettlementBatches } from "@/features/settlements/queries";

export function SettlementHistory() {
  const router = useRouter(); const query = useSettlementBatches();
  if (query.isPending) return <WorkspaceSkeleton label="Loading settlement batches" />;
  if (query.isError) return <ErrorState title="Settlement batches are unavailable" detail="No batch history is inferred in the browser." onRetry={() => void query.refetch()} />;
  const batches = query.data?.content ?? [];
  return <section aria-labelledby="settlement-history-title" className="overflow-hidden rounded-2xl border border-border bg-surface"><div className="p-5"><h2 id="settlement-history-title" className="font-semibold">Settlement batches</h2><p className="mt-1 text-sm text-muted">Select a service-confirmed batch to inspect its payout legs.</p></div>{batches.length === 0 ? <p className="border-t border-border p-5 text-sm text-muted">No settlement batches are available.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Batch</TableHead><TableHead>Gross</TableHead><TableHead>Net</TableHead><TableHead>Cutoff</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{batches.map(batch => <TableRow key={batch.id} className="cursor-pointer" onClick={() => router.replace(`/settlements?batchId=${encodeURIComponent(batch.id)}` as Route)}><TableCell className="max-w-52 break-all font-mono text-xs">{batch.id}</TableCell><TableCell className="font-mono">{formatMoney(batch.grossAmount, batch.currency)}</TableCell><TableCell className="font-mono">{formatMoney(batch.netAmount, batch.currency)}</TableCell><TableCell>{formatDate(batch.cutoffCompletedAt)}</TableCell><TableCell><Badge tone={batch.status === "PAID" ? "success" : batch.status === "FAILED" || batch.status === "CANCELLED" ? "danger" : "pending"}>{batch.status}</Badge></TableCell></TableRow>)}</TableBody></Table></div>}</section>;
}
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(date); }
