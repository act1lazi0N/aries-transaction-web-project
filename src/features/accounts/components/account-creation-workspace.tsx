"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useReducer, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Building2, Check, CheckCircle2, Copy, RefreshCw, ShieldAlert, UserRound, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAccountType, formatMoney } from "@/features/accounts/format";
import { useCreateAccount } from "@/features/accounts/mutations";
import { accountKeys, useAccounts } from "@/features/accounts/queries";
import {
  accountCreationReducer,
  canonicalAccountRequest,
  createInitialAccountCreationState,
  matchesRecoveredAccount,
  validateAccountCreationDraft,
  type AccountCreationAttempt,
  type AccountCreationDraft,
  type AccountCreationState,
} from "@/features/accounts/creation-state";
import {
  clearAccountCreationAttempt,
  loadAccountCreationAttempt,
  saveAccountCreationAttempt,
} from "@/features/accounts/creation-attempt-storage";
import type { Account, CreatableAccountType } from "@/features/accounts/types";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { hasCapability } from "@/features/auth/capabilities";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

type Props = {
  mode: "onboarding" | "additional";
  onComplete?: (account: Account) => void;
};

export function AccountCreationWorkspace({ mode, onComplete }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useAuthSession();
  const accountsQuery = useAccounts();
  const mutation = useCreateAccount();
  const [state, dispatch] = useReducer(accountCreationReducer, undefined, createInitialAccountCreationState);
  const submitInFlight = useRef(false);
  const restoredUserId = useRef<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const statusRef = useRef<HTMLElement>(null);
  const draft = state.draft;
  const fieldErrors = state.tag === "editing" ? state.fieldErrors : {};
  const formError = state.tag === "editing" ? state.formError : undefined;
  const formLocked = state.tag !== "editing";

  useEffect(() => {
    const userId = session.user?.id;
    if (!userId || restoredUserId.current === userId) return;
    restoredUserId.current = userId;
    dispatch({ type: "restore_finished", attempt: loadAccountCreationAttempt(window.sessionStorage, userId) });
  }, [session.user?.id]);

  useEffect(() => {
    if (mode === "onboarding") titleRef.current?.focus();
  }, [mode]);

  function updateDraft(nextDraft: AccountCreationDraft) {
    dispatch({ type: "draft_updated", draft: nextDraft });
  }

  function selectAccountType(accountType: CreatableAccountType) {
    if (formLocked) return;
    updateDraft({ ...draft, accountType });
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.tag !== "editing") return;
    const errors = validateAccountCreationDraft(state.draft);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: "validation_failed", fieldErrors: errors, formError: "Check the highlighted account details before continuing." });
      focusFirstInvalidField();
      return;
    }
    dispatch({ type: "review_started" });
    focusStatus(statusRef);
  }

  async function submitOrReplay() {
    if ((state.tag !== "review" && state.tag !== "unknown") || submitInFlight.current || !session.user) return;
    const attempt = state.tag === "unknown" ? state.attempt : createAttempt(state.draft, session.user.id, accountsQuery.data ?? []);
    if (state.tag === "review") saveAccountCreationAttempt(window.sessionStorage, attempt);
    submitInFlight.current = true;
    mutation.reset();
    dispatch({ type: "submit_started", attempt });
    try {
      const account = await mutation.mutateAsync(attempt.request);
      clearAccountCreationAttempt(window.sessionStorage, attempt.userId);
      dispatch({ type: "submit_succeeded", account });
      focusStatus(statusRef);
    } catch (error) {
      if (error instanceof ApiError && error.kind === "validation") {
        clearAccountCreationAttempt(window.sessionStorage, attempt.userId);
        dispatch({
          type: "server_validation_failed",
          fieldErrors: accountCreationFieldErrors(error),
          formError: "The service rejected these account details before creation. Review the highlighted fields.",
        });
        focusFirstInvalidField();
        return;
      }
      const decision = creationErrorDecision(error);
      if (decision.kind === "rejected") {
        clearAccountCreationAttempt(window.sessionStorage, attempt.userId);
        dispatch({ type: "submit_rejected", ...decision });
        if (decision.code === "ACCOUNT_LIMIT_EXCEEDED") void accountsQuery.refetch();
      } else {
        dispatch({ type: "submit_unknown", message: decision.message, requestId: decision.requestId });
      }
      focusStatus(statusRef);
    } finally {
      submitInFlight.current = false;
    }
  }

  async function checkAccounts() {
    if (state.tag !== "unknown") return;
    const result = await accountsQuery.refetch();
    if (result.isError) {
      dispatch({ type: "recovery_checked", message: "Aries could not read your accounts, so the request outcome is still unknown. Try the status check again when the service is available." });
      focusStatus(statusRef);
      return;
    }
    const recovered = result.data?.find(account => mode === "onboarding"
      ? !state.attempt.knownAccountIds.includes(account.id)
      : matchesRecoveredAccount(account, state.attempt));
    if (recovered) {
      clearAccountCreationAttempt(window.sessionStorage, state.attempt.userId);
      dispatch({ type: "submit_succeeded", account: recovered });
    } else {
      dispatch({ type: "recovery_checked", message: "No matching account is visible yet. You can check again or replay the same confirmed request." });
    }
    focusStatus(statusRef);
  }

  function editDetails() {
    if (session.user) clearAccountCreationAttempt(window.sessionStorage, session.user.id);
    dispatch({ type: "edit" });
    window.setTimeout(() => document.querySelector<HTMLInputElement>("input[name='accountType']")?.focus(), 0);
  }

  function startOver() {
    if (session.user) clearAccountCreationAttempt(window.sessionStorage, session.user.id);
    dispatch({ type: "start_over" });
    window.setTimeout(() => document.querySelector<HTMLInputElement>("input[name='accountType']")?.focus(), 0);
  }

  function continueToWorkspace(account: Account) {
    const userId = session.user?.id ?? account.userId;
    queryClient.setQueryData<Account[]>(accountKeys.mine(userId), current => {
      if (!current) return [account];
      return current.some(item => item.id === account.id) ? current.map(item => item.id === account.id ? account : item) : [...current, account];
    });
    void queryClient.invalidateQueries({ queryKey: accountKeys.mine(userId) });
    if (onComplete) onComplete(account);
    else router.push(`/overview?accountId=${encodeURIComponent(account.id)}` as Route);
  }

  const title = mode === "onboarding" ? "Create your first financial account" : "Open another financial account";
  const detail = mode === "onboarding"
    ? "Your workspace profile is ready. Create a financial account to start using transfers and other account features."
    : "Choose an account type, check the details Aries will manage, and submit one request.";

  const mayCreate = hasCapability(session.user?.role, "accounts:create");
  const activeAccountCount = accountsQuery.data?.filter(account => account.status === "ACTIVE").length ?? 0;
  if (session.status === "authenticated" && !mayCreate) return <section role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6"><div className="flex items-start gap-3"><AlertTriangle aria-hidden="true" size={19} className="mt-0.5 text-[var(--aries-danger)]" /><div><h1 className="font-semibold text-[var(--aries-danger)]">You cannot create a financial account</h1><p className="mt-2 text-sm leading-6 text-muted">Only customer and merchant roles can request an owned financial account. The backend remains the authorization boundary.</p><Link href={"/overview" as Route} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted">Return to overview</Link></div></div></section>;
  if (mode === "additional" && accountsQuery.isSuccess && activeAccountCount >= 5) return <section role="status" className="rounded-2xl border border-border bg-surface p-6"><h1 className="text-xl font-semibold">Active account limit reached</h1><p className="mt-2 text-sm leading-6 text-muted">The current contract allows up to five active accounts. No creation request was submitted.</p><Link href={"/overview" as Route} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted">Return to overview</Link></section>;

  return <section aria-labelledby="account-creation-title" className="space-y-6">
    <div className="max-w-3xl">
      <p className="text-sm font-medium text-accent">Financial account setup</p>
      <h1 ref={titleRef} id="account-creation-title" tabIndex={-1} className="mt-1 text-3xl font-semibold tracking-tight outline-none">{title}</h1>
      <p className="mt-3 max-w-2xl leading-7 text-muted">{detail}</p>
    </div>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.78fr)]">
      <form onSubmit={review} noValidate className="space-y-6 rounded-2xl border border-border bg-surface p-5 sm:p-6" aria-describedby={formError ? "account-creation-error" : "account-creation-help"}>
        <div>
          <h2 className="text-lg font-semibold">Account details</h2>
          <p id="account-creation-help" className="mt-2 text-sm leading-6 text-muted">Your Aries profile and financial account are separate. Choose an account type and add an optional description to continue.</p>
        </div>
        <fieldset disabled={formLocked} aria-describedby={fieldErrors.accountType ? "account-type-error" : undefined}>
          <legend className="text-sm font-medium">Account type</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <AccountTypeChoice type="PERSONAL" selected={draft.accountType === "PERSONAL"} invalid={Boolean(fieldErrors.accountType)} onSelect={selectAccountType} icon={<UserRound aria-hidden="true" size={18} />} label="Personal" detail="For everyday money management" />
            <AccountTypeChoice type="BUSINESS" selected={draft.accountType === "BUSINESS"} invalid={Boolean(fieldErrors.accountType)} onSelect={selectAccountType} icon={<Building2 aria-hidden="true" size={18} />} label="Business" detail="For business income and payments" />
          </div>
          {fieldErrors.accountType && <p id="account-type-error" role="alert" className="mt-2 text-xs text-[var(--aries-danger)]">{fieldErrors.accountType}</p>}
        </fieldset>
        <div>
          <label htmlFor="account-currency" className="block text-sm font-medium">Currency</label>
          <input id="account-currency" value="VND" readOnly aria-readonly="true" className="mt-2 h-11 w-full rounded-lg border border-border bg-surface-muted px-3 text-sm text-muted" />
          <p className="mt-1 text-xs text-muted">Aries currently supports VND for this account.</p>
        </div>
        <div>
          <div className="flex items-center justify-between gap-3"><label htmlFor="account-description" className="text-sm font-medium">Description <span className="font-normal text-muted">(optional)</span></label><span className="text-xs text-muted">{draft.description.length}/255</span></div>
          <textarea id="account-description" value={draft.description} onChange={event => updateDraft({ ...draft, description: event.target.value })} disabled={formLocked} maxLength={255} rows={4} aria-invalid={Boolean(fieldErrors.description)} aria-describedby={fieldErrors.description ? "account-description-error" : "account-description-help"} className="mt-2 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-60" />
          <p id="account-description-help" className="mt-1 text-xs text-muted">Add a short label that will help you recognize this account.</p>
          {fieldErrors.description && <p id="account-description-error" role="alert" className="mt-1 text-xs text-[var(--aries-danger)]">{fieldErrors.description}</p>}
        </div>
        {formError && <p id="account-creation-error" role="alert" className="text-sm text-[var(--aries-danger)]">{formError}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={formLocked}>{state.tag === "restoring" ? "Restoring request…" : "Review account"}</Button>
          {mode === "additional" && <Link href={"/overview" as Route} className="inline-flex min-h-10 items-center justify-center rounded-lg px-3.5 py-2 text-sm font-semibold text-muted hover:bg-surface-muted hover:text-foreground">Cancel</Link>}
        </div>
      </form>
      <section ref={statusRef} tabIndex={-1} role="region" aria-live="polite" aria-labelledby="account-status-title" className="rounded-2xl border border-border bg-surface p-5 outline-none sm:p-6">
        <AccountCreationStatus state={state} isChecking={accountsQuery.isFetching} onEdit={editDetails} onSubmit={() => void submitOrReplay()} onCheck={() => void checkAccounts()} onStartOver={startOver} onContinue={continueToWorkspace} />
      </section>
    </div>
  </section>;
}

function AccountTypeChoice({ type, selected, invalid, onSelect, icon, label, detail }: { type: CreatableAccountType; selected: boolean; invalid: boolean; onSelect: (type: CreatableAccountType) => void; icon: React.ReactNode; label: string; detail: string }) {
  return <label className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-left transition-colors focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2", selected ? "border-accent bg-surface-muted" : "border-border bg-surface hover:bg-surface-muted")}>
    <input type="radio" name="accountType" value={type} checked={selected} onChange={() => onSelect(type)} className="sr-only" data-invalid={invalid ? "true" : undefined} />
    <span className={cn("grid size-9 place-items-center rounded-lg", selected ? "bg-accent text-accent-foreground" : "bg-surface-muted text-muted")}>{icon}</span>
    <span><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs text-muted">{detail}</span></span>
  </label>;
}

function AccountCreationStatus({ state, isChecking, onEdit, onSubmit, onCheck, onStartOver, onContinue }: {
  state: AccountCreationState;
  isChecking: boolean;
  onEdit: () => void;
  onSubmit: () => void;
  onCheck: () => void;
  onStartOver: () => void;
  onContinue: (account: Account) => void;
}) {
  if (state.tag === "restoring") return <StatusMessage icon={<RefreshCw aria-hidden="true" size={20} className="animate-spin text-[var(--aries-pending)]" />} title="Restoring account request" detail="Aries is checking this browser session for an unfinished idempotent request." />;
  if (state.tag === "review" || state.tag === "submitting") return <div>
    <div className="flex items-start gap-3"><ShieldAlert aria-hidden="true" size={20} className="mt-0.5 text-[var(--aries-warning)]" /><div><h2 id="account-status-title" className="font-semibold">Review before creating</h2><p className="mt-1 text-sm leading-6 text-muted">This is a client review of the exact request. The server still owns authorization, account number, balance, and status.</p></div></div>
    <AccountRequestSummary draft={state.draft} />
    {state.tag === "submitting" && <p role="status" className="mt-4 text-sm text-[var(--aries-pending)]">Creating account… The service has not returned an authoritative result yet.</p>}
    <div className="mt-6 flex flex-wrap gap-2"><Button type="button" onClick={onSubmit} disabled={state.tag === "submitting"}>{state.tag === "submitting" ? "Creating account…" : "Create financial account"}</Button><Button type="button" variant="secondary" onClick={onEdit} disabled={state.tag === "submitting"}>Edit details</Button></div>
  </div>;
  if (state.tag === "unknown") return <StatusMessage icon={<AlertTriangle aria-hidden="true" size={20} className="text-[var(--aries-warning)]" />} title="Account creation status unavailable" detail={state.message} tone="warning" requestId={state.requestId} actions={<><Button type="button" variant="secondary" onClick={onCheck} disabled={isChecking}>{isChecking ? "Checking accounts…" : "Check accounts"}</Button><Button type="button" onClick={onSubmit} disabled={isChecking}>Retry same request</Button></>} />;
  if (state.tag === "rejected") return <StatusMessage icon={<AlertTriangle aria-hidden="true" size={20} className="text-[var(--aries-danger)]" />} title="Account request rejected" detail={state.message} tone="danger" requestId={state.requestId} actions={state.blocked ? <Button type="button" variant="secondary" onClick={onStartOver}>Start a new review</Button> : <Button type="button" variant="secondary" onClick={onEdit}>Review details</Button>} />;
  if (state.tag === "result") return <div>
    <div className="flex items-start gap-3"><CheckCircle2 aria-hidden="true" size={20} className="mt-0.5 text-[var(--aries-success)]" /><div><h2 id="account-status-title" className="font-semibold">Financial account created</h2><p className="mt-1 text-sm leading-6 text-muted">Aries confirmed the account details shown below.</p></div></div>
    <dl className="mt-5 space-y-3 rounded-xl bg-surface-muted p-4 text-sm">
      <SummaryItem label="Account number" value={<span className="inline-flex items-center justify-end gap-2"><span className="font-mono">{state.account.accountNumber}</span><CopyAccountNumber value={state.account.accountNumber} /></span>} />
      <SummaryItem label="Type" value={formatAccountType(state.account.accountType)} />
      <SummaryItem label="Balance" value={<span className="font-mono font-semibold tabular-nums">{formatMoney(state.account.balance, state.account.currency)}</span>} />
      <SummaryItem label="Status" value={state.account.status} />
    </dl>
    <Button type="button" className="mt-6" onClick={() => onContinue(state.account)}>Continue to workspace</Button>
  </div>;
  return <StatusMessage icon={<WalletCards aria-hidden="true" size={20} className="text-muted" />} title="What Aries will create" detail="Check the account type and the details Aries will set before you submit." actions={<AccountRequestSummary draft={state.draft} compact />} />;
}

function AccountRequestSummary({ draft, compact }: { draft: AccountCreationDraft; compact?: boolean }) {
  return <dl className={cn("space-y-3 rounded-xl bg-surface-muted p-4 text-sm", compact ? "mt-4" : "mt-5")}>
    <SummaryItem label="Account type" value={draft.accountType ? formatAccountType(draft.accountType) : "Not selected"} />
    <SummaryItem label="Currency" value="VND" />
    <SummaryItem label="Account number" value="Generated by Aries" />
    <SummaryItem label="Opening balance" value={<span className="font-mono tabular-nums">{formatMoney("0", "VND")}</span>} />
    <SummaryItem label="Initial status" value="Active" />
    <SummaryItem label="Description" value={draft.description.trim() || "None"} />
  </dl>;
}

function SummaryItem({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4"><dt className="text-muted">{label}</dt><dd className="max-w-[65%] break-words text-right">{value}</dd></div>;
}

function StatusMessage({ icon, title, detail, tone = "neutral", actions, requestId }: { icon: React.ReactNode; title: string; detail: string; tone?: "neutral" | "warning" | "danger"; actions?: React.ReactNode; requestId?: string }) {
  return <div role={tone === "danger" ? "alert" : undefined}><div className="flex items-start gap-3">{icon}<div><h2 id="account-status-title" className="font-semibold">{title}</h2><p className={cn("mt-2 text-sm leading-6", tone === "danger" ? "text-[var(--aries-danger)]" : tone === "warning" ? "text-[var(--aries-warning)]" : "text-muted")}>{detail}</p>{requestId && <p className="mt-3 text-xs text-muted">Support request ID: <span className="font-mono">{requestId}</span></p>}</div></div>{actions && <div className="mt-6 flex flex-wrap gap-2">{actions}</div>}</div>;
}

function CopyAccountNumber({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1_500); }
    catch { setCopied(false); }
  }
  return <Button type="button" variant="ghost" className="min-h-7 px-1.5" aria-label={copied ? "Account number copied" : "Copy account number"} onClick={() => void copy()}>{copied ? <Check aria-hidden="true" size={14} /> : <Copy aria-hidden="true" size={14} />}</Button>;
}

function createAttempt(draft: AccountCreationDraft, userId: string, accounts: Account[]): AccountCreationAttempt {
  const idempotencyKey = newIdempotencyKey();
  return {
    version: 1,
    userId,
    request: canonicalAccountRequest(draft, idempotencyKey),
    knownAccountIds: accounts.map(account => account.id),
    createdAt: new Date().toISOString(),
  };
}

function newIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `aries-account-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function creationErrorDecision(error: unknown):
  | { kind: "rejected"; message: string; requestId?: string; code?: string; blocked: boolean }
  | { kind: "unknown"; message: string; requestId?: string } {
  if (!(error instanceof ApiError)) return { kind: "unknown", message: "The service did not confirm whether the account was created. Check accounts before replaying the request." };
  const common = { requestId: error.requestId ?? undefined, code: error.code ?? undefined };
  if (error.code === "ACCOUNT_LIMIT_EXCEEDED") return { kind: "rejected", ...common, blocked: true, message: "The service confirmed that the active-account limit has been reached." };
  if (error.code === "ACCOUNT_CREATION_IDEMPOTENCY_CONFLICT") return { kind: "rejected", ...common, blocked: true, message: "This idempotency key belongs to different account details. Start a new review; Aries will not replay a changed request." };
  if (error.kind === "forbidden") return { kind: "rejected", ...common, blocked: true, message: "Your current role is not allowed to create a financial account." };
  if (error.kind === "unauthorized") return { kind: "rejected", ...common, blocked: true, message: "Your sign-in session expired before Aries could confirm the request." };
  if (error.kind === "rate_limited") return { kind: "unknown", requestId: common.requestId, message: `The request was rate limited and no account result was confirmed. Check accounts or replay the same request${error.retryAfterSeconds === null ? " after waiting" : ` after ${error.retryAfterSeconds} seconds`}.` };
  return { kind: "unknown", requestId: common.requestId, message: "The service did not confirm whether the account was created. Check accounts before replaying the same request." };
}

function accountCreationFieldErrors(error: ApiError) {
  const errors: Partial<Record<"accountType" | "description", string>> = {};
  if (error.errors?.accountType) errors.accountType = error.errors.accountType;
  if (error.errors?.description) errors.description = error.errors.description;
  return errors;
}

function focusFirstInvalidField() {
  window.setTimeout(() => document.querySelector<HTMLElement>("[aria-invalid='true'], [data-invalid='true']")?.focus(), 0);
}

function focusStatus(ref: React.RefObject<HTMLElement | null>) {
  window.setTimeout(() => ref.current?.focus(), 0);
}
