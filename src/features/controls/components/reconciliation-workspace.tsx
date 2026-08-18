"use client";

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import type { Route } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { useCreateReconciliationRun } from "@/features/controls/mutations";
import { useReconciliationRun } from "@/features/controls/queries";
import { initialReconciliationDraft, toReconciliationRequest, type ReconciliationDraft, validateReconciliationDraft } from "@/features/controls/form";
import { toReconciliationLifecycle, type ReconciliationException, type ReconciliationRun } from "@/features/controls/types";
import { ApiError, userFacingErrorMessage } from "@/lib/api/errors";

type Props = { initialRunId?: string };

export function ReconciliationWorkspace({ initialRunId }: Props) {
  const session = useAuthSession();
  const router = useRouter();
  const [draft, setDraft] = useState<ReconciliationDraft>(initialReconciliationDraft);
  const [preview, setPreview] = useState<ReturnType<typeof toReconciliationRequest> | null>(null);
  const [errors, setErrors] = useState<ReturnType<typeof validateReconciliationDraft>>({});
  const [selectedRunId, setSelectedRunId] = useState(initialRunId);
  const [runIdInput, setRunIdInput] = useState(initialRunId ?? "");
  const mutation = useCreateReconciliationRun();
  const query = useReconciliationRun(selectedRunId);
  const canOperate = ["OPERATOR", "ADMIN"].includes(session.user?.role.toUpperCase() ?? "");

  function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.reset();
    const nextErrors = validateReconciliationDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setPreview(toReconciliationRequest(draft));
  }

  function confirmRun() {
    if (!preview || mutation.isPending) return;
    mutation.mutate(preview, {
      onSuccess: (run) => {
        setSelectedRunId(run.id);
        setRunIdInput(run.id);
        setPreview(null);
        setDraft(initialReconciliationDraft);
        setErrors({});
        router.replace(`/controls?runId=${encodeURIComponent(run.id)}` as Route);
      },
    });
  }

  function clearRun() {
    setSelectedRunId(undefined);
    setRunIdInput("");
    setPreview(null);
    mutation.reset();
    router.replace("/controls" as Route);
  }

  function openRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = runIdInput.trim();
    if (!next || next.length > 100) return;
    setSelectedRunId(next);
    router.replace(`/controls?runId=${encodeURIComponent(next)}` as Route);
  }

  if (!canOperate) return <PermissionDenied />;

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
    <section aria-labelledby="reconciliation-request-title" className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-start gap-3">
        <ShieldAlert aria-hidden="true" className="mt-0.5 text-[var(--aries-warning)]" size={19} />
        <div>
          <h2 id="reconciliation-request-title" className="text-lg font-semibold">Run reconciliation</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Compare completed transaction records for a specific time window. The service returns the result and any exceptions.</p>
        </div>
      </div>
      <form onSubmit={submitDraft} className="mt-6 space-y-5" aria-describedby="reconciliation-help">
        <p id="reconciliation-help" className="text-xs leading-5 text-muted">Times are sent as UTC offsets. Running a reconciliation does not change transaction data.</p>
        <Field label="Currency" value={draft.currency} error={errors.currency} onChange={(value) => setDraft({ ...draft, currency: value })} maxLength={3} />
        <Field label="Window start" type="datetime-local" value={draft.windowStart} error={errors.windowStart} onChange={(value) => setDraft({ ...draft, windowStart: value })} />
        <Field label="Window end" type="datetime-local" value={draft.windowEnd} error={errors.windowEnd} onChange={(value) => setDraft({ ...draft, windowEnd: value })} />
        <Button type="submit" disabled={mutation.isPending}>Review reconciliation <CheckCircle2 aria-hidden="true" size={16} /></Button>
      </form>
      <form onSubmit={openRun} className="mt-6 border-t border-border pt-6" aria-describedby="reconciliation-open-help">
        <label htmlFor="reconciliation-run-id" className="block text-sm font-medium">Open an existing run<input id="reconciliation-run-id" value={runIdInput} onChange={(event) => setRunIdInput(event.target.value)} placeholder="Paste a run ID" maxLength={100} className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 font-mono text-sm outline-none focus:border-accent" /></label>
        <p id="reconciliation-open-help" className="mt-2 text-xs leading-5 text-muted">The service will verify whether you can view this run.</p>
        <Button type="submit" variant="secondary" className="mt-3" disabled={!runIdInput.trim()}>Open run</Button>
      </form>
      {preview && <div className="mt-6 rounded-xl bg-surface-muted p-4" aria-labelledby="reconciliation-review-title">
        <p id="reconciliation-review-title" className="text-sm font-semibold">Review before running</p>
        <dl className="mt-4 space-y-3 text-sm">
          <ReviewItem label="Currency" value={preview.currency} />
          <ReviewItem label="Window start" value={formatDateTime(preview.windowStart)} />
          <ReviewItem label="Window end" value={formatDateTime(preview.windowEnd)} />
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" onClick={confirmRun} disabled={mutation.isPending}>{mutation.isPending ? <><Clock3 aria-hidden="true" size={16} className="mr-2 animate-pulse" />Running…</> : "Run reconciliation"}</Button>
          <Button type="button" variant="secondary" onClick={() => setPreview(null)} disabled={mutation.isPending}>Edit</Button>
        </div>
        {mutation.error && <p role="alert" className="mt-4 text-sm text-[var(--aries-danger)]">{userFacingErrorMessage(mutation.error, "The reconciliation outcome is unknown. No automatic retry was made; confirm the backend run status before trying again.")}</p>}
      </div>}
    </section>
    <RunPanel run={query.data} isLoading={query.isLoading} isFetching={query.isFetching} error={query.error} onRetry={() => void query.refetch()} onClear={clearRun} />
  </div>;
}

function PermissionDenied() {
  return <section role="alert" className="rounded-2xl border border-border bg-surface p-8"><div className="flex gap-3"><ShieldAlert aria-hidden="true" className="mt-0.5 text-[var(--aries-danger)]" size={19} /><div><h2 className="font-semibold">You do not have access to these controls</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted">Reconciliation is available only to authorized operations users. No run data was requested.</p></div></div></section>;
}

function RunPanel({ run, isLoading, isFetching, error, onRetry, onClear }: { run?: ReconciliationRun; isLoading: boolean; isFetching: boolean; error: Error | null; onRetry: () => void; onClear: () => void }) {
  if (!run && !isLoading && !error) return <section aria-labelledby="reconciliation-empty-title" className="rounded-2xl border border-dashed border-border bg-surface p-8"><p id="reconciliation-empty-title" className="font-medium">No reconciliation selected</p><p className="mt-2 text-sm leading-6 text-muted">Review a request on the left to start a run, or open a run ID from an earlier result.</p></section>;
  if (isLoading && !run) return <section role="status" aria-label="Loading reconciliation run" className="rounded-2xl border border-border bg-surface p-8"><div className="h-5 w-44 animate-pulse rounded bg-surface-muted" /><div className="mt-6 h-32 animate-pulse rounded-xl bg-surface-muted" /></section>;
  if (error && !run) return <section role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6"><div className="flex gap-3"><AlertTriangle aria-hidden="true" className="mt-0.5 text-[var(--aries-danger)]" size={18} /><div><p className="font-medium text-[var(--aries-danger)]">We could not load this reconciliation</p><p className="mt-1 text-sm leading-6 text-muted">{error instanceof ApiError && (error.kind === "forbidden" || error.kind === "unauthorized") ? "You do not have permission to view this run." : "The current run status is unavailable. We will not guess the result."}</p><div className="mt-4 flex gap-2"><Button type="button" variant="secondary" onClick={onRetry}>Try again</Button><Button type="button" variant="ghost" onClick={onClear}>Clear selection</Button></div></div></div></section>;
  if (!run) return null;
  return <RunResult run={run} isFetching={isFetching} onClear={onClear} onRetry={onRetry} />;
}

function RunResult({ run, isFetching, onClear, onRetry }: { run: ReconciliationRun; isFetching: boolean; onClear: () => void; onRetry: () => void }) {
  const lifecycle = toReconciliationLifecycle(run.status);
  const tone = lifecycle.kind === "completed" ? "success" : lifecycle.kind === "failed" ? "danger" : lifecycle.kind === "running" ? "pending" : "warning";
  const [filter, setFilter] = useState("ALL");
  const filteredExceptions = useMemo(() => filter === "ALL" ? run.exceptions : run.exceptions.filter((item) => item.exceptionType === filter), [filter, run.exceptions]);
  const columns = useMemo<ColumnDef<ReconciliationException>[]>(() => [
    { accessorKey: "exceptionType", header: "Type", cell: (info) => <span className="font-medium">{String(info.getValue()).replaceAll("_", " ")}</span> },
    { accessorKey: "transactionId", header: "Transaction", cell: (info) => <span className="break-all font-mono text-xs">{String(info.getValue())}</span> },
    { accessorKey: "sourceAmount", header: "Source", cell: (info) => <span className="font-mono tabular-nums">{String(info.getValue())} {run.currency}</span> },
    { accessorKey: "reportingAmount", header: "Reporting", cell: (info) => <span className="font-mono tabular-nums">{String(info.getValue())} {run.currency}</span> },
    { accessorKey: "details", header: "Details" },
  ], [run.currency]);
  const table = useReactTable({ data: filteredExceptions, columns, getCoreRowModel: getCoreRowModel(), getRowId: (row) => row.id });
  const exceptionTypes = Array.from(new Set(run.exceptions.map((item) => item.exceptionType)));

  return <section aria-labelledby="reconciliation-result-title" className="rounded-2xl border border-border bg-surface p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-sm font-medium text-accent">Reconciliation result</p><h2 id="reconciliation-result-title" className="mt-1 text-xl font-semibold">Reconciliation run</h2></div>
      <div className="flex items-center gap-2"><Badge tone={tone}>{lifecycle.label}</Badge><Button type="button" variant="ghost" onClick={onClear}>Start a new run</Button></div>
    </div>
    <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted"><span className="break-all font-mono">Run {run.id}</span>{isFetching && <span role="status" className="inline-flex items-center gap-1"><RefreshCw aria-hidden="true" size={13} className="animate-spin" />Updating</span>}<Button type="button" variant="ghost" className="min-h-7 px-2" onClick={onRetry}>Refresh</Button></div>
    <dl className="mt-6 grid gap-3 sm:grid-cols-3"><Metric label="Source records" value={String(run.sourceCount)} /><Metric label="Reporting records" value={String(run.reportingCount)} /><Metric label="Exceptions" value={String(run.exceptionCount)} /></dl>
    <dl className="mt-6 grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-2"><ReviewItem label="Currency" value={run.currency} /><ReviewItem label="Window" value={`${formatDateTime(run.windowStart)} – ${formatDateTime(run.windowEnd)}`} /><ReviewItem label="Created" value={formatDateTime(run.createdAt)} /><ReviewItem label="Completed" value={run.completedAt ? formatDateTime(run.completedAt) : "Not completed"} /></dl>
    {lifecycle.kind === "running" && <p role="status" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-[var(--aries-warning)]">This run is still being processed. We will not show it as complete until the service confirms it.</p>}
    {lifecycle.kind === "unknown" && <p role="alert" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-[var(--aries-warning)]">The service returned a status we do not recognize. We will not mark this run as successful or failed.</p>}
    <div className="mt-8 flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-semibold">Exceptions</h3><p className="mt-1 text-sm text-muted">Only exceptions returned for this run are shown.</p></div>{exceptionTypes.length > 0 && <label className="text-sm font-medium">Filter by type<select value={filter} onChange={(event) => setFilter(event.target.value)} className="mt-2 block h-10 rounded-lg border border-border bg-surface px-3 text-sm font-normal outline-none focus:border-accent"><option value="ALL">All types</option>{exceptionTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>}</div>
    {filteredExceptions.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center"><p className="font-medium">{run.exceptions.length === 0 ? "No exceptions found" : "No exceptions match this filter"}</p><p className="mt-2 text-sm text-muted">{run.exceptions.length === 0 ? "No reconciliation exceptions were returned for this run." : "Choose another type or clear the filter."}</p></div> : <div className="mt-4 overflow-x-auto rounded-xl border border-border"><Table><TableHeader><TableRow>{table.getHeaderGroups()[0]?.headers.map((header) => <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow></TableHeader><TableBody>{table.getRowModel().rows.map((row) => <TableRow key={row.id}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)}</TableBody></Table></div>}
  </section>;
}

function Field({ label, value, error, onChange, type = "text", maxLength }: { label: string; value: string; error?: string; onChange: (value: string) => void; type?: "text" | "datetime-local"; maxLength?: number }) {
  const id = `reconciliation-${label.toLowerCase().replaceAll(" ", "-")}`;
  return <label htmlFor={id} className="block text-sm font-medium">{label}<input id={id} type={type} value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent" />{error && <span id={`${id}-error`} className="mt-1 block text-xs font-normal text-[var(--aries-danger)]">{error}</span>}</label>;
}

function ReviewItem({ label, value }: { label: string; value: string }) { return <div><dt className="text-muted">{label}</dt><dd className="mt-1 break-all font-medium">{value}</dd></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-surface-muted p-4"><dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt><dd className="mt-2 font-mono text-xl font-semibold tabular-nums">{value}</dd></div>; }
function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Unavailable" : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(date); }
