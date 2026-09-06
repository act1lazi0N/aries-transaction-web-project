"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorState, WorkspaceSkeleton } from "@/components/ui/workspace-state";
import { useReconciliationRuns } from "@/features/controls/queries";

export function ReconciliationHistory() {
  const router = useRouter(); const query = useReconciliationRuns();
  if (query.isPending) return <WorkspaceSkeleton label="Loading reconciliation history" />;
  if (query.isError) return <ErrorState title="Reconciliation history is unavailable" detail="No run history is reconstructed in the browser." onRetry={() => void query.refetch()} />;
  const runs = query.data?.content ?? [];
  return <section aria-labelledby="reconciliation-history-title" className="overflow-hidden rounded-2xl border border-border bg-surface"><div className="p-5"><h2 id="reconciliation-history-title" className="font-semibold">Recent reconciliation runs</h2><p className="mt-1 text-sm text-muted">Open a confirmed run before starting another review.</p></div>{runs.length === 0 ? <p className="border-t border-border p-5 text-sm text-muted">No runs have been recorded.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Run</TableHead><TableHead>Window</TableHead><TableHead>Coverage</TableHead><TableHead>Exceptions</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{runs.map(run => <TableRow key={run.id} className="cursor-pointer" onClick={() => router.replace(`/controls?runId=${encodeURIComponent(run.id)}` as Route)}><TableCell className="max-w-52 break-all font-mono text-xs">{run.id}</TableCell><TableCell>{run.currency}<p className="mt-1 text-xs text-muted">{formatDate(run.windowStart)} – {formatDate(run.windowEnd)}</p></TableCell><TableCell>{run.sourceCount} core / {run.reportingCount} reporting</TableCell><TableCell>{run.exceptionCount}</TableCell><TableCell><Badge tone={run.status === "COMPLETED" ? "success" : run.status === "FAILED" ? "danger" : "pending"}>{run.status}</Badge></TableCell></TableRow>)}</TableBody></Table></div>}</section>;
}
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(date); }
