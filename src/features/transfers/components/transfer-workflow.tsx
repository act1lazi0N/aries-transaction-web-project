"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import { Clock3, Send, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountSelect } from "@/features/accounts/components/account-selector";
import { useAccounts } from "@/features/accounts/queries";
import { isActiveAccount } from "@/features/accounts/types";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { useCreateTransfer } from "@/features/transfers/mutations";
import { toTransactionLifecycle } from "@/features/transactions/types";
import { userFacingErrorMessage } from "@/lib/api/errors";

type Draft = { fromAccountId: string; toAccountId: string; amount: string; currency: string; description: string };
const initialDraft: Draft = { fromAccountId: "", toAccountId: "", amount: "", currency: "", description: "" };

function newIdempotencyKey() { return globalThis.crypto?.randomUUID?.() ?? `aries-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export function TransferWorkflow({ initialAccountId }: { initialAccountId?: string }) {
  const [draft, setDraft] = useState<Draft>(() => initialAccountId ? { ...initialDraft, fromAccountId: initialAccountId } : initialDraft);
  const [preview, setPreview] = useState<Draft | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const accountsQuery = useAccounts();
  const mutation = useCreateTransfer();
  const lifecycle = mutation.data ? toTransactionLifecycle(mutation.data) : null;
  const activeAccounts = useMemo(() => (accountsQuery.data ?? []).filter(isActiveAccount), [accountsQuery.data]);
  const selectedSourceCurrency = accountsQuery.data?.find(account => account.id === draft.fromAccountId)?.currency ?? draft.currency;
  const validation = useMemo(() => {
    if (!preview) return null;
    const from = accountsQuery.data?.find(account => account.id === preview.fromAccountId);
    const to = accountsQuery.data?.find(account => account.id === preview.toAccountId);
    if (!from || !to) return "Choose both accounts from the backend-authorized account list.";
    if (!isActiveAccount(from) || !isActiveAccount(to)) return "Both accounts must be active before a transfer can be submitted.";
    if (from.currency !== to.currency) return "Source and destination accounts must use the same currency.";
    if (!/^\d+(?:\.\d{1,2})?$/.test(preview.amount) || !isMinimumAmount(preview.amount)) return "Amount must be at least 1000 with at most two decimal places.";
    if (preview.fromAccountId === preview.toAccountId) return "Source and destination accounts must be different.";
    return null;
  }, [accountsQuery.data, preview]);

  const selectSource = useCallback((accountId: string) => {
    const account = accountsQuery.data?.find(item => item.id === accountId);
    setDraft(current => ({ ...current, fromAccountId: accountId, currency: account?.currency ?? current.currency, toAccountId: current.toAccountId === accountId ? "" : current.toAccountId }));
  }, [accountsQuery.data]);

  function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.reset();
    setPreview({ ...draft, fromAccountId: draft.fromAccountId.trim(), toAccountId: draft.toAccountId.trim(), amount: draft.amount.trim(), currency: selectedSourceCurrency.trim().toUpperCase() });
  }

  function confirm() {
    if (!preview || validation) return;
    mutation.mutate({ ...preview, idempotencyKey, description: preview.description.trim() || undefined });
  }

  function reset() { setDraft(initialDraft); setPreview(null); setIdempotencyKey(newIdempotencyKey()); mutation.reset(); }

  function accountLabel(accountId: string) {
    const account = accountsQuery.data?.find(item => item.id === accountId);
    return account ? `${account.accountNumber} (${account.currency})` : accountId;
  }

  return <AuthGate><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
    <form onSubmit={submitDraft} className="space-y-5 rounded-2xl border border-border bg-surface p-6" aria-describedby="transfer-help">
      <div><h2 className="text-lg font-semibold">Transfer details</h2><p id="transfer-help" className="mt-2 text-sm leading-6 text-muted">Choose backend-authorized accounts, review the consequence, then submit it once. No balance is inferred before backend confirmation.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <AccountSelect accounts={accountsQuery.data ?? []} value={draft.fromAccountId} onChange={selectSource} label="Source account" id="transfer-source-account" isLoading={accountsQuery.isPending} isFetching={accountsQuery.isFetching} error={accountsQuery.error} onRetry={() => void accountsQuery.refetch()} disabled={mutation.isPending} />
        <AccountSelect accounts={accountsQuery.data ?? []} value={draft.toAccountId} onChange={accountId => setDraft(current => ({ ...current, toAccountId: accountId }))} label="Destination account" id="transfer-destination-account" excludeAccountId={draft.fromAccountId} isLoading={accountsQuery.isPending} disabled={mutation.isPending} />
        <Field label="Amount" value={draft.amount} onChange={value => setDraft({ ...draft, amount: value })} inputMode="decimal" required />
        <Field label="Currency (from source account)" value={selectedSourceCurrency || "Choose a source account"} onChange={() => undefined} readOnly />
      </div>
      <label htmlFor="transfer-description" className="block text-sm font-medium">Description<input id="transfer-description" value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} maxLength={255} className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent" /></label>
      {accountsQuery.data && activeAccounts.length < 2 && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-[var(--aries-warning)]">At least two active accounts are required before a transfer can be reviewed.</p>}
      <Button type="submit" disabled={mutation.isPending || activeAccounts.length < 2}>Review transfer <Send aria-hidden="true" size={16} /></Button>
    </form>
    <section aria-labelledby="transfer-status-title" className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-start gap-3"><ShieldAlert aria-hidden="true" className="mt-0.5 text-[var(--aries-warning)]" size={19} /><div><h2 id="transfer-status-title" className="font-semibold">Safe execution</h2><p className="mt-2 text-sm leading-6 text-muted">A submitted request is not shown as completed unless the backend returns that status.</p></div></div>
      {!preview && <p className="mt-6 text-sm text-muted">Preview appears here before any request is sent.</p>}
      {preview && !mutation.data && <div className="mt-6 space-y-4"><p className="text-sm font-medium">Preview — nothing submitted</p><dl className="space-y-3 rounded-xl bg-surface-muted p-4 text-sm"><Item label="From" value={accountLabel(preview.fromAccountId)} /><Item label="To" value={accountLabel(preview.toAccountId)} /><Item label="Amount" value={`${preview.amount} ${preview.currency}`} /><Item label="Description" value={preview.description || "None"} /></dl>{validation && <p role="alert" className="text-sm text-[var(--aries-danger)]">{validation}</p>}{mutation.error && <p role="alert" className="text-sm text-[var(--aries-danger)]">{userFacingErrorMessage(mutation.error, "Transfer was not submitted. No financial state was changed.")}</p>}<div className="flex flex-wrap gap-2"><Button type="button" onClick={confirm} disabled={Boolean(validation) || mutation.isPending}>{mutation.isPending ? <><Clock3 aria-hidden="true" size={16} className="mr-2 animate-pulse" />Submitting…</> : "Submit transfer"}</Button><Button type="button" variant="secondary" onClick={() => setPreview(null)} disabled={mutation.isPending}>Edit</Button></div></div>}
      {mutation.isPending && <p role="status" className="mt-5 text-sm text-[var(--aries-warning)]">Request submitted; waiting for the backend response.</p>}
      {mutation.data && <div className="mt-6 space-y-4"><p role="status" className="text-sm font-medium">{lifecycle?.kind === "succeeded" ? "Backend confirmed the transfer." : lifecycle?.kind === "pending" ? "Transfer accepted and remains pending." : `Backend status: ${lifecycle?.label ?? "Status unavailable"}.`}</p><dl className="space-y-3 rounded-xl bg-surface-muted p-4 text-sm"><Item label="Transaction" value={mutation.data.id} /><Item label="Status" value={lifecycle?.label ?? "Status unavailable"} /><Item label="Amount" value={`${mutation.data.amount} ${mutation.data.currency}`} /></dl><Button type="button" variant="secondary" onClick={reset}>Start another transfer</Button></div>}
    </section>
  </div></AuthGate>;
}

function Field({ label, value, onChange, inputMode, required, readOnly }: { label: string; value: string; onChange: (value: string) => void; inputMode?: "decimal"; required?: boolean; readOnly?: boolean }) { return <label className="block text-sm font-medium">{label}<input required={required} value={value} onChange={event => onChange(event.target.value)} inputMode={inputMode} readOnly={readOnly} className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent read-only:bg-surface-muted" /></label>; }
function Item({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4"><dt className="text-muted">{label}</dt><dd className="break-all text-right font-mono text-xs">{value}</dd></div>; }
function isMinimumAmount(value: string) {
  const [integer] = value.split(".");
  const normalizedInteger = integer.replace(/^0+(?=\d)/, "");
  return normalizedInteger.length > 4 || normalizedInteger.length === 4 && normalizedInteger >= "1000";
}
