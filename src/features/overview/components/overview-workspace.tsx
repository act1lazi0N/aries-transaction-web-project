"use client";

import Link from "next/link";
import type { Route } from "next";
import { Activity, AlertTriangle, Clock3, RefreshCw, ShieldCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccountSelect } from "@/features/accounts/components/account-selector";
import { formatAccountType, formatMoney } from "@/features/accounts/format";
import { useAccounts } from "@/features/accounts/queries";
import { accountStatusLabel, type Account } from "@/features/accounts/types";
import { useTransactionHistory } from "@/features/transactions/queries";
import { TransactionStatusBadge } from "@/features/transactions/components/transaction-status-badge";
import { TransactionRouteSummary } from "@/features/transactions/components/transaction-party-display";
import type { TransactionRead } from "@/features/transactions/types";
import { ApiError } from "@/lib/api/errors";

export function OverviewWorkspace({ initialAccountId }: { initialAccountId?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const accountsQuery = useAccounts();
  const selectedAccount = useMemo(() => accountsQuery.data?.find(account => account.id === initialAccountId) ?? accountsQuery.data?.[0], [accountsQuery.data, initialAccountId]);
  const activityQuery = useTransactionHistory({ accountId: selectedAccount?.id ?? "", page: 0, size: 5, sort: "createdAt,desc" });

  useEffect(() => {
    if (!initialAccountId && selectedAccount) {
      router.replace(`${pathname}?accountId=${encodeURIComponent(selectedAccount.id)}` as Route, { scroll: false });
    }
  }, [initialAccountId, pathname, router, selectedAccount]);

  function selectAccount(accountId: string) {
    router.replace(`${pathname}?accountId=${encodeURIComponent(accountId)}` as Route, { scroll: false });
  }

  if (accountsQuery.isPending) return <OverviewLoading />;
  if (accountsQuery.isError && !accountsQuery.data) return <LoadError error={accountsQuery.error} onRetry={() => void accountsQuery.refetch()} />;
  if (!accountsQuery.data || accountsQuery.data.length === 0) return <EmptyAccounts />;
  if (!selectedAccount) return <EmptyAccounts detail="The requested account is not available in the authenticated account list." />;

  const pendingCount = activityQuery.data?.content.filter(transaction => transaction.status === "PENDING").length ?? 0;
  const activeAccountCount = accountsQuery.data.filter(account => account.status === "ACTIVE").length;
  return <div className="space-y-8">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-3xl"><p className="mb-3 text-sm font-medium text-accent">Account overview</p><h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">A clear view of what needs attention.</h1><p className="mt-3 max-w-2xl text-base leading-7 text-muted">See your balances and recent activity in one place. Balances are always shown separately by currency.</p></div><div className="w-full max-w-md"><AccountSelect accounts={accountsQuery.data} value={selectedAccount.id} onChange={selectAccount} label="Account" id="overview-account" isFetching={accountsQuery.isFetching} error={accountsQuery.error} onRetry={() => void accountsQuery.refetch()} /></div></div>
    {accountsQuery.isError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[var(--aries-warning)]">Account refresh failed; the last confirmed account data remains visible.</p>}
    <section aria-labelledby="account-summary-title"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-accent">Your account information</p><h2 id="account-summary-title" className="mt-1 text-xl font-semibold">Your accounts</h2></div><div className="flex flex-wrap items-center gap-3">{activeAccountCount < 5 ? <Link href={"/accounts/new" as Route} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-accent-foreground hover:brightness-95">Open another account</Link> : <span className="text-sm text-muted">Active account limit reached</span>}<Link href={`/transactions?accountId=${encodeURIComponent(selectedAccount.id)}` as Route} className="text-sm font-semibold text-accent hover:underline">View transactions</Link></div></div><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{accountsQuery.data.map(account => <AccountCard key={account.id} account={account} selected={account.id === selectedAccount.id} onSelect={() => selectAccount(account.id)} />)}</div></section>
    <section aria-label="Account metrics" className="grid gap-4 md:grid-cols-3"><Metric label="Selected currency" value={selectedAccount.currency} detail={`${formatAccountType(selectedAccount.accountType)} · ${accountStatusLabel(selectedAccount.status)}`} icon={ShieldCheck} /><Metric label="Activity records" value={activityQuery.data ? String(activityQuery.data.totalElements) : "—"} detail="Total records for the selected account" icon={Activity} /><Metric label="Recent pending" value={String(pendingCount)} detail="Pending records in the current activity view" icon={Clock3} /></section>
    <section aria-labelledby="attention-title" className="rounded-2xl border border-border bg-surface p-6 lg:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-accent">Activity for this account</p><h2 id="attention-title" className="mt-1 text-xl font-semibold">Recent transactions</h2></div><Link href={`/transfers?accountId=${encodeURIComponent(selectedAccount.id)}` as Route} className="text-sm font-semibold text-accent hover:underline">Start a transfer</Link></div>{activityQuery.isPending && <div role="status" className="mt-5 rounded-xl bg-surface-muted p-5 text-sm text-muted">Loading recent transactions…</div>}{activityQuery.isError && !activityQuery.data && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-[var(--aries-danger)]"><div className="flex items-start gap-3"><AlertTriangle aria-hidden="true" size={18} /><div><p className="font-medium">We could not load recent transactions</p><p className="mt-1 text-muted">We will not guess whether anything changed. Try again when the service is available.</p><Button variant="secondary" className="mt-4" onClick={() => void activityQuery.refetch()}>Try again</Button></div></div></div>}{activityQuery.isError && activityQuery.data && <p role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[var(--aries-warning)]">We could not refresh your activity, so we are showing the last available transactions.</p>}{activityQuery.isFetching && !activityQuery.isPending && <p role="status" className="mt-5 flex items-center gap-2 text-sm text-muted"><RefreshCw aria-hidden="true" size={15} className="animate-spin" />Updating activity; your current transactions remain visible.</p>}{activityQuery.data && <ActivityList accountId={selectedAccount.id} transactions={activityQuery.data.content} />}</section>
  </div>;
}

function AccountCard({ account, selected, onSelect }: { account: Account; selected: boolean; onSelect: () => void }) {
  const tone = account.status === "ACTIVE" ? "success" : account.status === "FROZEN" ? "warning" : account.status === "CLOSED" ? "danger" : "neutral";
  return <button type="button" onClick={onSelect} className={`w-full rounded-2xl border bg-surface p-5 text-left transition-colors hover:bg-surface-muted ${selected ? "border-accent" : "border-border"}`} aria-pressed={selected}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-muted">{formatAccountType(account.accountType)}</p><p className="mt-1 font-mono text-sm">{account.accountNumber}</p></div><Badge tone={tone}>{accountStatusLabel(account.status)}</Badge></div><p className="mt-7 font-mono text-2xl font-semibold tabular-nums">{formatMoney(account.balance, account.currency)}</p><p className="mt-2 text-xs text-muted">{account.currency} · {selected ? "Selected account" : "Select to inspect activity"}</p></button>;
}

function ActivityList({ accountId, transactions }: { accountId: string; transactions: TransactionRead[] }) {
  if (transactions.length === 0) return <div className="mt-5 rounded-xl border border-dashed border-border p-8 text-center"><p className="font-medium">No transactions found</p><p className="mt-2 text-sm text-muted">The backend returned no records for this account.</p></div>;
  return <div className="mt-5 divide-y divide-border rounded-xl border border-border">{transactions.map(transaction => <Link key={transaction.id} href={`/transactions?accountId=${encodeURIComponent(accountId)}&transactionId=${encodeURIComponent(transaction.id)}` as Route} className="flex flex-col gap-3 px-4 py-4 hover:bg-surface-muted sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><TransactionRouteSummary transaction={transaction} compact /><p className="mt-2 font-mono text-[11px] text-muted">Reference {transaction.id.slice(0, 8)}…</p></div><div className="flex items-center justify-between gap-4 sm:justify-end"><div className="text-right"><span className="block font-mono text-sm tabular-nums">{formatMoney(transaction.amount, transaction.currency)}</span><time dateTime={transaction.createdAt} className="text-xs text-muted">{formatDate(transaction.createdAt)}</time></div><TransactionStatusBadge transaction={{ status: transaction.status, failureReason: transaction.failureReason }} /></div></Link>)}</div>;
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Activity }) { return <article className="rounded-2xl border border-border bg-surface p-5"><div className="mb-8 flex items-center justify-between"><p className="text-sm font-medium text-muted">{label}</p><Icon aria-hidden="true" size={19} className="text-muted" /></div><p className="text-2xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-sm leading-6 text-muted">{detail}</p></article>; }
function EmptyAccounts({ detail = "There are no accounts available for this profile. No balance is shown." }: { detail?: string }) { return <section role="status" className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center"><p className="font-medium">No accounts available</p><p className="mt-2 text-sm leading-6 text-muted">{detail}</p></section>; }
function LoadError({ error, onRetry }: { error: Error; onRetry: () => void }) { const denied = error instanceof ApiError && (error.kind === "forbidden" || error.kind === "unauthorized"); return <section role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6"><p className="font-medium text-[var(--aries-danger)]">{denied ? "We cannot access your accounts" : "We could not load your accounts"}</p><p className="mt-2 text-sm text-muted">{denied ? "Sign in again or contact your administrator." : "No balance is shown. Try again when the service is available."}</p><Button variant="secondary" className="mt-4" onClick={onRetry}>Try again</Button></section>; }
function OverviewLoading() { return <div role="status" aria-label="Loading account overview" className="space-y-5"><div className="h-5 w-40 animate-pulse rounded bg-surface-muted" /><div className="h-12 w-80 animate-pulse rounded bg-surface-muted" /><div className="grid gap-4 md:grid-cols-3"><div className="h-32 animate-pulse rounded-2xl bg-surface-muted" /><div className="h-32 animate-pulse rounded-2xl bg-surface-muted" /><div className="h-32 animate-pulse rounded-2xl bg-surface-muted" /></div></div>; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date); }
