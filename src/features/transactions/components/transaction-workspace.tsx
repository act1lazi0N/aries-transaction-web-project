"use client";

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Copy, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api/errors";
import { useReverseTransaction } from "@/features/transactions/mutations";
import { useTransactionHistory } from "@/features/transactions/queries";
import { TransactionStatusBadge } from "@/features/transactions/components/transaction-status-badge";
import { toTransactionLifecycle, type Transaction } from "@/features/transactions/types";
import { AuthGate } from "@/features/auth/components/auth-gate";

type Props = { accountId?: string; page: number; size: number; sort: string };

function formatAmount(value: string, currency: string) {
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) return `${value} ${currency}`;
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [integer, fraction = ""] = unsigned.split(".");
  if (fraction.length > 20) return `${value} ${currency}`;
  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: fraction.length,
      maximumFractionDigits: fraction.length,
    });
    const parts = formatter.formatToParts(negative ? -1 : 0);
    return parts.map(part => part.type === "integer" ? integer.replace(/^0+(?=\d)/, "") : part.type === "fraction" ? fraction : part.value).join("");
  }
  catch { return `${value} ${currency}`; }
}

function formatDate(value: string) {
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
  catch { return value; }
}

function idempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `aries-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function TransactionWorkspace({ accountId, page, size, sort }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [reversalKey, setReversalKey] = useState<string | null>(null);
  const reversalTriggerRef = useRef<HTMLButtonElement | null>(null);
  const reverseMutation = useReverseTransaction();
  const query = useTransactionHistory({ accountId: accountId ?? "", page, size, sort });

  const updateUrl = (next: Partial<Props>) => {
    const params = new URLSearchParams();
    const values = { accountId, page, size, sort, ...next };
    if (values.accountId) params.set("accountId", values.accountId);
    params.set("page", String(values.page)); params.set("size", String(values.size)); params.set("sort", values.sort);
    router.replace(`${pathname}?${params.toString()}` as Route, { scroll: false });
  };

  const columns = useMemo<ColumnDef<Transaction>[]>(() => [
    { accessorKey: "id", header: "Transaction", cell: ({ row }) => <TransactionIdentifier value={row.original.id} /> },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => <span className="font-mono tabular-nums">{formatAmount(row.original.amount, row.original.currency)}</span> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <TransactionStatusBadge transaction={row.original} /> },
    { accessorKey: "createdAt", header: "Created", cell: ({ row }) => <time dateTime={row.original.createdAt}>{formatDate(row.original.createdAt)}</time> },
    { id: "action", header: "Action", cell: ({ row }) => row.original.status === "COMPLETED" ? <Button variant="secondary" className="min-h-9 px-3 text-xs" onClick={event => { reversalTriggerRef.current = event.currentTarget; reverseMutation.reset(); setReversalKey(idempotencyKey()); setSelected(row.original); }}>Review reversal</Button> : <span className="text-xs text-muted">No action</span> },
  ], [reverseMutation]);
  const table = useReactTable({ data: query.data?.content ?? [], columns, getCoreRowModel: getCoreRowModel(), getRowId: row => row.id });

  if (!accountId) return <EmptyState title="Select an account to view transactions" detail="The API requires an account identifier. No transaction or balance data is inferred without one." />;
  if (query.isPending) return <LoadingState />;
  if (query.isError && !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.data || (query.data.empty && !query.isError)) return <EmptyState title="No transactions found" detail="This account has no transactions for the current view." />;

  return <div className="space-y-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm text-muted">Account <span className="font-mono text-xs">{accountId}</span></p><p className="mt-1 text-sm text-muted">{query.data.totalElements} total records</p></div><div className="flex items-center gap-2"><label htmlFor="page-size" className="text-sm text-muted">Rows</label><select id="page-size" value={size} onChange={event => updateUrl({ size: Number(event.target.value), page: 0 })} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm"><option value="20">20</option><option value="50">50</option><option value="100">100</option></select><Button variant="ghost" aria-label="Refresh transactions" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw aria-hidden="true" size={17} className={query.isFetching ? "animate-spin" : ""} /></Button></div></div>
    {query.isError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[var(--aries-warning)]"><span>Refresh failed. Showing the last confirmed transaction data.</span><Button variant="secondary" onClick={() => void query.refetch()}>Retry refresh</Button></div>}
    {query.isFetching && <p role="status" className="flex items-center gap-2 text-sm text-muted"><RefreshCw aria-hidden="true" size={15} className="animate-spin" />Refreshing; current data remains visible.</p>}
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface"><Table><TableHeader><TableRow>{table.getHeaderGroups()[0]?.headers.map(header => <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow></TableHeader><TableBody>{table.getRowModel().rows.map(row => <TableRow key={row.id}>{row.getVisibleCells().map(cell => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)}</TableBody></Table></div>
    <div className="flex items-center justify-between"><p className="text-sm text-muted">Page {page + 1} of {Math.max(query.data.totalPages, 1)}</p><div className="flex gap-2"><Button variant="secondary" onClick={() => updateUrl({ page: page - 1 })} disabled={page <= 0}><ChevronLeft aria-hidden="true" size={16} />Previous</Button><Button variant="secondary" onClick={() => updateUrl({ page: page + 1 })} disabled={query.data.last}><ChevronRight aria-hidden="true" size={16} />Next</Button></div></div>
    {selected && reversalKey && <ReversalDialog transaction={selected} result={reverseMutation.data} isPending={reverseMutation.isPending} error={reverseMutation.error} returnFocusRef={reversalTriggerRef} onClose={() => { if (!reverseMutation.isPending) { setSelected(null); setReversalKey(null); reverseMutation.reset(); } }} onConfirm={() => reverseMutation.mutate({ transactionId: selected.id, idempotencyKey: reversalKey })} />}
  </div>;
}

function LoadingState() { return <div role="status" aria-label="Loading transactions" className="space-y-3 rounded-2xl border border-border bg-surface p-6"><div className="h-5 w-36 animate-pulse rounded bg-surface-muted" /><div className="h-52 animate-pulse rounded-xl bg-surface-muted" /></div>; }
function EmptyState({ title, detail }: { title: string; detail: string }) { return <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center"><p className="font-medium">{title}</p><p className="mt-2 text-sm leading-6 text-muted">{detail}</p></div>; }
function TransactionIdentifier({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }
    catch { setCopied(false); }
  }
  return <span className="inline-flex items-center gap-1"><span className="font-mono text-xs" title={value}>{value.slice(0, 8)}…</span><Button type="button" variant="ghost" className="min-h-7 px-1.5" aria-label={copied ? "Transaction ID copied" : "Copy transaction ID"} title={value} onClick={() => void copy()}>{copied ? <Check aria-hidden="true" size={14} /> : <Copy aria-hidden="true" size={14} />}</Button></span>;
}
function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) { const apiError = error instanceof ApiError ? error : null; const denied = apiError?.kind === "forbidden" || apiError?.kind === "unauthorized"; return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6"><div className="flex gap-3"><AlertTriangle aria-hidden="true" className="mt-0.5 text-[var(--aries-danger)]" size={18} /><div><p className="font-medium text-[var(--aries-danger)]">{denied ? "You cannot access these transactions" : "Transactions could not be loaded"}</p><p className="mt-1 text-sm text-muted">{denied ? "Check your account access or sign in again. No transaction state was changed." : "No transaction state was changed. Retry when the service is available."}</p><Button variant="secondary" className="mt-4" onClick={onRetry}>Try again</Button></div></div></div>; }
function ReversalDialog({ transaction, result, isPending, error, returnFocusRef, onClose, onConfirm }: { transaction: Transaction; result?: Transaction; isPending: boolean; error: Error | null; returnFocusRef: RefObject<HTMLButtonElement | null>; onClose: () => void; onConfirm: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const returnFocusTarget = returnFocusRef.current;
    closeRef.current?.focus();
    return () => returnFocusTarget?.focus();
  }, [returnFocusRef]);
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && !isPending) { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  const lifecycle = result ? toTransactionLifecycle(result) : null;
  const completed = lifecycle?.kind === "succeeded" || lifecycle?.kind === "reversed";
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 p-6" role="presentation"><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="reversal-title" aria-describedby="reversal-description" onKeyDown={handleKeyDown} className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl"><div className="flex items-start gap-3"><CheckCircle2 aria-hidden="true" className="mt-0.5 text-[var(--aries-warning)]" size={19} /><div><h2 id="reversal-title" className="text-lg font-semibold">Review transaction reversal</h2><p id="reversal-description" className="mt-2 text-sm leading-6 text-muted">This sends a reversal request for the completed transaction below. The transaction remains completed until the backend confirms a reversal.</p><dl className="mt-4 space-y-2 rounded-xl bg-surface-muted p-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted">Amount</dt><dd className="font-mono font-semibold">{formatAmount(transaction.amount, transaction.currency)}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted">Transaction</dt><dd className="font-mono text-xs">{transaction.id}</dd></div></dl>{isPending && <p role="status" className="mt-3 text-sm text-[var(--aries-warning)]">Request submitted; reversal status is still processing.</p>}{result && <p role="status" className="mt-3 text-sm text-muted">{completed ? "Backend confirmed the reversal." : lifecycle?.kind === "pending" ? "Backend accepted the request; reversal remains pending." : `Backend status: ${lifecycle?.label ?? "Status unavailable"}.`}</p>}{error && <p role="alert" className="mt-3 text-sm text-[var(--aries-danger)]">The reversal request failed. No completed reversal is shown. Try again with the same request identifier or close this dialog.</p>}<div className="mt-6 flex justify-end gap-2"><Button ref={closeRef} variant="ghost" onClick={onClose} disabled={isPending}>{result || error ? "Close" : "Cancel"}</Button>{!result && <Button variant="danger" onClick={onConfirm} disabled={isPending}>{isPending ? <><Clock3 aria-hidden="true" size={16} className="mr-2 animate-pulse" />Requesting…</> : "Request reversal"}</Button>}</div></div></div></section></div>;
}
