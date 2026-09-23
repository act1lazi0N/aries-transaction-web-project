"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { useCooldown } from "@/features/auth/use-security-operation";
import { useAccounts } from "@/features/accounts/queries";
import { formatMoney } from "@/features/accounts/format";
import { validateTransferDetails } from "@/features/transfers/validation";
import { createQr, listQr, revokeQr, qrKeys, qrError, type CreateQr, type QrCode, type QrType } from "../api";
import { uncertain } from "@/features/smart-otp/api";
import { ApiError } from "@/lib/api/errors";
import { QrImage } from "./qr-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const empty: QrCode[] = [];
const date = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
export function ReceiveQr({ accountId = "", page = 0, initialQrId, onBusyChange }: { accountId?: string; page?: number; initialQrId?: string; onBusyChange?: (busy: boolean) => void }) {
  const session = useAuthSession(); const accounts = useAccounts(); const router = useRouter(); const cache = useQueryClient(); const cooldown = useCooldown();
  const [type, setType] = useState<QrType>("ACCOUNT"); const [amount, setAmount] = useState(""); const [description, setDescription] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(initialQrId); const [confirmId, setConfirmId] = useState<string>(); const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ amount?: string; description?: string }>({});
  const [unknownCreate, setUnknownCreate] = useState(false); const lock = useRef(false);
  const attempt = useRef<{ body: CreateQr; key: string } | null>(null);
  const account = accounts.data?.find(value => value.id === accountId);
  const list = useQuery({ queryKey: qrKeys.list(session.user?.id ?? "", accountId, page), queryFn: async () => { try { return await listQr(session.request, accountId, page); } catch (error) { if (error instanceof ApiError && error.retryAfterSeconds) cooldown.start(error.retryAfterSeconds); throw error; } }, enabled: Boolean(session.user && account), retry: false, networkMode: "always", refetchOnWindowFocus: false,
    refetchInterval: query => query.state.error || cooldown.seconds > 0 ? false : query.state.data?.content.some(qr => qr.id === selectedId && qr.type === "PAYMENT_REQUEST" && qr.state === "ACTIVE") ? 10_000 : false,
    refetchIntervalInBackground: false,
  });
  const create = useMutation({ mutationFn: (value: { body: CreateQr; key: string }) => createQr(session.request, accountId, value.body, value.key), retry: false, networkMode: "always" });
  const revoke = useMutation({ mutationFn: (id: string) => revokeQr(session.request, id), retry: false, networkMode: "always" });
  const selected = (revoke.data?.id === selectedId ? revoke.data : undefined) ?? list.data?.content.find(qr => qr.id === selectedId) ?? (create.data?.id === selectedId ? create.data : undefined);
  const busy = create.isPending || revoke.isPending;
  useEffect(() => { onBusyChange?.(busy || unknownCreate); }, [busy, unknownCreate, onBusyChange]);
  const columns = useMemo<ColumnDef<QrCode>[]>(() => [
    { accessorKey: "type", header: "Type", cell: ({ row }) => row.original.type === "ACCOUNT" ? "Reusable account QR" : "Payment request" },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => row.original.amount ? formatMoney(row.original.amount, "VND") : "Payer enters amount" },
    { accessorKey: "state", header: "Status" },
    { accessorKey: "createdAt", header: "Created", cell: ({ row }) => date(row.original.createdAt) },
    { id: "details", header: "Details", cell: ({ row }) => <Button type="button" variant="secondary" disabled={busy} onClick={() => { setSelectedId(row.original.id); setConfirmId(undefined); }}>View QR<span className="sr-only"> {row.original.id}</span></Button> },
  ], [busy]);
  const table = useReactTable({ data: list.data?.content ?? empty, columns, getCoreRowModel: getCoreRowModel(), getRowId: row => row.id, manualPagination: true, pageCount: list.data?.totalPages ?? 0 });
  function navigate(nextAccount: string, nextPage: number) { router.replace(`/transfers?view=receive&accountId=${encodeURIComponent(nextAccount)}&page=${nextPage}` as Route, { scroll: false }); }
  function failure(error: unknown) { setMessage(qrError(error)); if (error instanceof ApiError && error.retryAfterSeconds) cooldown.start(error.retryAfterSeconds); }
  async function submit() {
    if (lock.current || cooldown.seconds || !account || account.status !== "ACTIVE" || account.currency !== "VND" || !list.isSuccess) return;
    if (!attempt.current) {
      if (type === "PAYMENT_REQUEST") {
        const errors = validateTransferDetails({ mode: "EXTERNAL", sourceAccountId: accountId, recipientAccountNumber: "", amount, description, currency: "VND" });
        if (errors.amount || errors.description) { setFieldErrors(errors); setMessage("Check the highlighted request fields."); return; }
        setFieldErrors({});
      }
      attempt.current = { key: crypto.randomUUID(), body: type === "ACCOUNT" ? { type, currency: "VND" } : { type, currency: "VND", amount: amount.trim(), description: description.trim() || undefined } };
    }
    lock.current = true; setMessage("");
    try { const result = await create.mutateAsync(attempt.current); setSelectedId(result.id); setUnknownCreate(false); attempt.current = null; await cache.invalidateQueries({ queryKey: qrKeys.all }); if (page !== 0) router.replace(`/transfers?view=receive&accountId=${encodeURIComponent(accountId)}&page=0&qrId=${encodeURIComponent(result.id)}` as Route, { scroll: false }); }
    catch (error) { failure(error); setUnknownCreate(unknownCreate || uncertain(error)); if (!unknownCreate && !uncertain(error)) attempt.current = null; if (error instanceof ApiError && error.code === "QR_ACCOUNT_EXISTS") await cache.invalidateQueries({ queryKey: qrKeys.all }); }
    finally { lock.current = false; }
  }
  async function confirmRevoke() {
    if (!confirmId || lock.current || cooldown.seconds) return;
    lock.current = true; setMessage("");
    try { const result = await revoke.mutateAsync(confirmId); cache.setQueryData(qrKeys.list(session.user?.id ?? "", accountId, page), (old: Awaited<ReturnType<typeof listQr>> | undefined) => old ? { ...old, content: old.content.map(qr => qr.id === result.id ? result : qr) } : old); setConfirmId(undefined); await cache.invalidateQueries({ queryKey: qrKeys.all }); }
    catch (error) { failure(error); }
    finally { lock.current = false; }
  }
  async function refresh() { const result = await list.refetch(); if (result.error) failure(result.error); }
  return <div className={selected ? "space-y-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)] lg:items-start lg:gap-6 lg:space-y-0" : "space-y-6"}>
    <section className="space-y-5 rounded-2xl border border-border bg-surface p-6" aria-labelledby="receive-title"><h2 id="receive-title" className="text-xl font-semibold">Receive with QR</h2>
      <label className="block text-sm font-medium">Receiving account<select className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3" value={accountId} disabled={busy || unknownCreate || accounts.isPending} onChange={event => navigate(event.target.value, 0)}><option value="">Choose an account</option>{accounts.data?.map(value => <option key={value.id} value={value.id}>{value.accountNumber} · {value.currency} · {value.status}</option>)}</select></label>
      {accounts.error && <div role="alert"><p>Accounts could not be refreshed.</p><Button type="button" variant="secondary" onClick={() => void accounts.refetch()}>Refresh accounts</Button></div>}
      {account && <><p className="text-sm text-muted">Account QRs are reusable. Payment requests fix the amount and expire after 15 minutes or one successful payment.</p><form className="space-y-4" onSubmit={event => { event.preventDefault(); void submit(); }}><fieldset disabled={busy || unknownCreate || cooldown.seconds > 0 || account.status !== "ACTIVE" || account.currency !== "VND"} className="space-y-4"><legend className="sr-only">New receiving QR</legend><label className="block text-sm font-medium">QR type<select className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3" value={type} onChange={event => setType(event.target.value === "ACCOUNT" ? "ACCOUNT" : "PAYMENT_REQUEST")}><option value="ACCOUNT">Reusable account QR</option><option value="PAYMENT_REQUEST">Single payment request</option></select></label>{type === "PAYMENT_REQUEST" && <><label className="block text-sm font-medium">Request amount (VND)<Input value={amount} inputMode="decimal" aria-invalid={Boolean(fieldErrors.amount)} aria-describedby={fieldErrors.amount ? "qr-amount-error" : undefined} onChange={event => { setAmount(event.target.value); setFieldErrors(current => ({ ...current, amount: undefined })); }} />{fieldErrors.amount && <span id="qr-amount-error" role="alert" className="mt-1 block text-xs text-[var(--aries-danger)]">{fieldErrors.amount}</span>}</label><label className="block text-sm font-medium">Request description<Input value={description} maxLength={255} aria-invalid={Boolean(fieldErrors.description)} aria-describedby={fieldErrors.description ? "qr-description-error" : undefined} onChange={event => { setDescription(event.target.value); setFieldErrors(current => ({ ...current, description: undefined })); }} />{fieldErrors.description && <span id="qr-description-error" role="alert" className="mt-1 block text-xs text-[var(--aries-danger)]">{fieldErrors.description}</span>}</label></>}</fieldset><Button type="submit" disabled={busy || cooldown.seconds > 0 || !list.isSuccess || account.status !== "ACTIVE" || account.currency !== "VND"}>{create.isPending ? "Creating QR…" : unknownCreate ? "Retry same QR request" : "Create QR"}</Button></form>{(account.status !== "ACTIVE" || account.currency !== "VND") && <p role="status">Only active VND accounts can create a QR. Existing codes remain available for review and revocation.</p>}</>}
      {unknownCreate && <p role="alert">Creation is unconfirmed. Retry the same request; do not create a replacement.</p>}
      {message && <p role="alert" className="text-sm text-[var(--aries-warning)]">{message}</p>}{cooldown.seconds > 0 && <p role="status">Try again in {cooldown.seconds}s.</p>}
    </section>
    {account && <section aria-label="Your QR codes" className="lg:col-start-1 space-y-4 rounded-2xl border border-border bg-surface p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Your QR codes</h2><Button type="button" variant="secondary" disabled={list.isFetching || busy || cooldown.seconds > 0} onClick={() => void refresh()}>Refresh QR list</Button></div>
      {list.isPending && <p role="status">Loading QR codes…</p>}{list.error && <p role="alert">{qrError(list.error)} Existing data may be stale.</p>}
      {list.data?.content.length === 0 && <p>No QR codes on this page. Create a QR to receive money.</p>}
      {list.data && <><div className="overflow-x-auto"><Table><TableHeader>{table.getHeaderGroups().map(group => <TableRow key={group.id}>{group.headers.map(header => <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader><TableBody>{table.getRowModel().rows.map(row => <TableRow key={row.id}>{row.getVisibleCells().map(cell => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)}</TableBody></Table></div><div className="flex items-center gap-3"><Button type="button" variant="secondary" disabled={page === 0 || busy || unknownCreate} onClick={() => navigate(accountId, page - 1)}>Previous</Button><span className="text-sm">Page {page + 1} of {Math.max(1, list.data.totalPages)}</span><Button type="button" variant="secondary" disabled={page + 1 >= list.data.totalPages || busy || unknownCreate} onClick={() => navigate(accountId, page + 1)}>Next</Button></div></>}
    </section>}
    {selected && <section aria-label="QR details" className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-6 space-y-4 rounded-2xl border border-border bg-surface p-6"><h2 className="text-lg font-semibold">{selected.type === "ACCOUNT" ? "Reusable account QR" : "Payment request"} · {selected.state}</h2>
      {selected.state === "ACTIVE" ? <QrImage key={selected.id} payload={selected.payload} label="Aries payment QR" downloadable /> : <p>This QR is {selected.state.toLowerCase()}.</p>}
      {selected.amount && <p className="font-semibold tabular-nums">{formatMoney(selected.amount, selected.currency)}</p>}{selected.description && <p>{selected.description}</p>}{selected.expiresAt && <p className="text-sm text-muted">Expires {date(selected.expiresAt)}</p>}{selected.transactionId && <p className="break-all text-sm">Paid transaction: {selected.transactionId}</p>}
      {selected.state !== "PAID" && selected.state !== "REVOKED" && (confirmId === selected.id ? <div className="space-y-3" role="group" aria-label="Confirm QR revocation"><p>Revoking this QR prevents new payments. It does not reverse a payment already completed.</p><div className="flex gap-3"><Button type="button" variant="danger" disabled={busy || cooldown.seconds > 0} onClick={() => void confirmRevoke()}>Confirm revoke QR</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => setConfirmId(undefined)}>Cancel</Button></div></div> : <Button type="button" variant="danger" disabled={busy || cooldown.seconds > 0} onClick={() => setConfirmId(selected.id)}>Revoke QR</Button>)}
    </section>}
  </div>;
}
