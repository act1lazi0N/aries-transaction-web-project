"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, Send, ShieldAlert, UserRound, WalletCards, XCircle } from "lucide-react";
import { AccountSelect } from "@/features/accounts/components/account-selector";
import { formatMoney } from "@/features/accounts/format";
import { useAccounts } from "@/features/accounts/queries";
import { isActiveAccount } from "@/features/accounts/types";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { TransactionStatusBadge } from "@/features/transactions/components/transaction-status-badge";
import { useTransactionDetail } from "@/features/transactions/queries";
import { toTransactionLifecycle, type Transaction } from "@/features/transactions/types";
import { useCreateTransferPreview, useExecuteTransferPreview } from "@/features/transfers/mutations";
import {
  changeTransferDraftMode,
  createInitialTransferState,
  transferWorkflowReducer,
} from "@/features/transfers/state";
import { transferRoutePath } from "@/features/transfers/search-params";
import type {
  TransferDraft,
  TransferFieldErrors,
  TransferPreview,
  TransferRouteMode,
  TransferWorkflowState,
} from "@/features/transfers/types";
import {
  executeErrorDecision,
  previewErrorMessage,
  toTransferPreviewRequest,
  transferFieldErrors,
  validateTransferAccounts,
  validateTransferDraft,
} from "@/features/transfers/validation";
import { ApiError } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  routeMode: TransferRouteMode;
  initialAccountId?: string;
  transactionId?: string;
};

type DraftStep = 1 | 2 | 3;

const draftSteps: ReadonlyArray<{ number: DraftStep; label: string; shortLabel: string }> = [
  { number: 1, label: "Destination", shortLabel: "Type" },
  { number: 2, label: "Accounts", shortLabel: "Accounts" },
  { number: 3, label: "Amount & note", shortLabel: "Details" },
];

export function TransferWorkflow({ routeMode, initialAccountId, transactionId }: Props) {
  const router = useRouter();
  const [state, dispatch] = useReducer(transferWorkflowReducer, undefined, () => createInitialTransferState(routeMode, initialAccountId));
  const [draftStep, setDraftStep] = useState<DraftStep>(1);
  const [now, setNow] = useState(() => Date.now());
  const previewInFlight = useRef(false);
  const executeInFlight = useRef(false);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const statusRegionRef = useRef<HTMLElement>(null);
  const accountsQuery = useAccounts();
  const previewMutation = useCreateTransferPreview();
  const executeMutation = useExecuteTransferPreview();
  const transactionQuery = useTransactionDetail(transactionId);
  const draft = state.draft;
  const routeSourceAccountId = initialAccountId ?? "";
  const eligibleAccounts = useMemo(
    () => (accountsQuery.data ?? []).filter(account => isActiveAccount(account) && account.currency === "VND"),
    [accountsQuery.data],
  );
  const eligibleAccountIds = useMemo(() => new Set(eligibleAccounts.map(account => account.id)), [eligibleAccounts]);
  const fieldErrors = state.tag === "editing" ? state.fieldErrors : {};
  const formError = state.tag === "editing" ? state.formError : undefined;
  const retryAt = state.tag === "editing" ? state.retryAt : undefined;
  const retrySeconds = retryAt ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0;
  const formLocked = state.tag !== "editing" || Boolean(transactionId);
  const hasEnoughAccounts = draft.mode === "EXTERNAL" ? eligibleAccounts.length >= 1 : eligibleAccounts.length >= 2;

  useEffect(() => {
    dispatch({ type: "route_changed", mode: routeMode, sourceAccountId: routeSourceAccountId });
  }, [routeMode, routeSourceAccountId]);

  useEffect(() => {
    const needsClock = state.tag === "review" || Boolean(retryAt && retryAt > Date.now());
    if (!needsClock) return;
    const immediate = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      window.clearTimeout(immediate);
      window.clearInterval(interval);
    };
  }, [retryAt, state.tag]);

  useEffect(() => {
    if (state.tag !== "review") return;
    const remaining = Date.parse(state.preview.expiresAt) - now;
    if (remaining <= 0) dispatch({ type: "preview_expired", message: "This preview has expired. Create a new preview before sending." });
  }, [now, state]);

  const updateRoute = useCallback((mode: TransferRouteMode, accountId: string, nextTransactionId?: string) => {
    router.replace(transferRoutePath({ mode, accountId: accountId || undefined, transactionId: nextTransactionId }) as Route, { scroll: false });
  }, [router]);

  function updateDraft(nextDraft: TransferDraft) {
    dispatch({ type: "draft_updated", draft: nextDraft });
  }

  function changeMode(mode: TransferRouteMode) {
    if (formLocked) return;
    const nextDraft = changeTransferDraftMode(draft, mode);
    updateDraft(nextDraft);
    updateRoute(mode, nextDraft.sourceAccountId);
  }

  function selectSource(sourceAccountId: string) {
    if (formLocked) return;
    const nextDraft = draft.mode === "EXTERNAL"
      ? { ...draft, sourceAccountId }
      : { ...draft, sourceAccountId, toAccountId: draft.toAccountId === sourceAccountId ? "" : draft.toAccountId };
    updateDraft(nextDraft);
    updateRoute(toRouteMode(nextDraft), sourceAccountId);
  }

  function showDraftStep(nextStep: DraftStep) {
    setDraftStep(nextStep);
    window.setTimeout(() => stepHeadingRef.current?.focus(), 0);
  }

  function continueDraft() {
    if (formLocked || accountsQuery.isPending || !hasEnoughAccounts) return;
    if (draftStep === 1) {
      showDraftStep(2);
      return;
    }
    if (draftStep === 2) {
      const errors = validateTransferAccounts(draft, eligibleAccountIds);
      if (Object.keys(errors).length > 0) {
        dispatch({ type: "validation_failed", fieldErrors: errors, formError: "Check the highlighted account details before continuing." });
        focusFirstInvalidField();
        return;
      }
      showDraftStep(3);
    }
  }

  function goBack() {
    if (formLocked || draftStep === 1) return;
    showDraftStep(draftStep === 3 ? 2 : 1);
  }

  function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draftStep < 3) {
      continueDraft();
      return;
    }
    void requestPreview();
  }

  async function requestPreview() {
    if (previewInFlight.current || retrySeconds > 0 || transactionId) return;
    const errors = validateTransferDraft(draft, eligibleAccountIds);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: "validation_failed", fieldErrors: errors, formError: "Check the highlighted fields before creating a preview." });
      showDraftStep(stepForFieldErrors(errors));
      focusFirstInvalidField();
      return;
    }
    previewInFlight.current = true;
    dispatch({ type: "preview_started" });
    try {
      const preview = await previewMutation.mutateAsync(toTransferPreviewRequest(draft));
      dispatch({ type: "preview_succeeded", preview, idempotencyKey: newIdempotencyKey() });
      focusStatusRegion(statusRegionRef);
    } catch (error) {
      const retryAfterSeconds = error instanceof ApiError ? error.retryAfterSeconds : null;
      const nextFieldErrors = transferFieldErrors(error);
      dispatch({
        type: "preview_failed",
        fieldErrors: nextFieldErrors,
        formError: previewErrorMessage(error),
        retryAt: retryAfterSeconds === null ? undefined : Date.now() + retryAfterSeconds * 1_000,
      });
      showDraftStep(previewErrorStep(error, nextFieldErrors));
      focusFirstInvalidField();
    } finally {
      previewInFlight.current = false;
    }
  }

  async function confirmOrRetry() {
    if ((state.tag !== "review" && state.tag !== "unknown") || executeInFlight.current || transactionId) return;
    const attempt = { preview: state.preview, idempotencyKey: state.idempotencyKey, draft: state.draft };
    executeInFlight.current = true;
    dispatch({ type: "execute_started" });
    try {
      const transaction = await executeMutation.mutateAsync({
        previewId: attempt.preview.previewId,
        idempotencyKey: attempt.idempotencyKey,
      });
      dispatch({ type: "execute_succeeded", transaction });
      updateRoute(toRouteMode(attempt.draft), attempt.draft.sourceAccountId, transaction.id);
      focusStatusRegion(statusRegionRef);
    } catch (error) {
      const decision = executeErrorDecision(error);
      if (decision.kind === "expired") {
        dispatch({ type: "preview_expired", message: decision.message });
      } else if (decision.kind === "unknown") {
        dispatch({ type: "execute_unknown", requestId: decision.requestId, code: decision.code });
      } else {
        dispatch({ type: "execute_rejected", ...decision });
      }
      if (error instanceof ApiError && ["INSUFFICIENT_BALANCE", "ACCOUNT_NOT_ACTIVE", "CURRENCY_MISMATCH"].includes(error.code ?? "")) {
        void accountsQuery.refetch();
      }
      focusStatusRegion(statusRegionRef);
    } finally {
      executeInFlight.current = false;
    }
  }

  function editDetails() {
    dispatch({ type: "edit" });
    showDraftStep(3);
  }

  function startAnother() {
    dispatch({ type: "start_over" });
    updateRoute(toRouteMode(draft), draft.sourceAccountId);
    showDraftStep(1);
  }

  return <AuthGate><div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.76fr)]">
    <form onSubmit={submitDraft} className="space-y-6 rounded-2xl border border-border bg-surface p-5 sm:p-6" aria-describedby="transfer-help transfer-step-help" noValidate>
      <div>
        <h2 className="text-lg font-semibold">Transfer details</h2>
        <p id="transfer-help" className="mt-2 text-sm leading-6 text-muted">Complete one step at a time. Nothing is sent until Aries creates a verified preview and you explicitly confirm it.</p>
      </div>

      <TransferStepIndicator currentStep={draftStep} />

      <section aria-labelledby="transfer-step-title" className="space-y-6">
        <div>
          <p className="text-sm font-medium text-accent">Step {draftStep} of 3</p>
          <h3 ref={stepHeadingRef} id="transfer-step-title" tabIndex={-1} className="mt-1 rounded-sm text-xl font-semibold">
            {draftStep === 1 ? "Choose a destination" : draftStep === 2 ? "Choose the accounts" : "Enter the amount and note"}
          </h3>
          <p id="transfer-step-help" className="mt-2 text-sm leading-6 text-muted">
            {draftStep === 1
              ? "Select whether you are sending to another person or moving money between your own accounts."
              : draftStep === 2
                ? draft.mode === "EXTERNAL" ? "Choose the source account and enter the recipient account number." : "Choose two different accounts that belong to you."
                : "Enter the transfer amount and add an optional description before creating the preview."}
          </p>
        </div>

        {draftStep === 1 && <div className="space-y-4">
          <fieldset disabled={formLocked}>
            <legend className="sr-only">Destination type</legend>
            <div className="grid gap-3">
              <ModeButton selected={draft.mode === "EXTERNAL"} onClick={() => changeMode("external")} icon={<UserRound aria-hidden="true" size={19} />} title="To another person" detail="Use a public account number" />
              <ModeButton selected={draft.mode === "OWN_ACCOUNTS"} onClick={() => changeMode("own-accounts")} icon={<WalletCards aria-hidden="true" size={19} />} title="Between my accounts" detail="Choose another owned account" />
            </div>
          </fieldset>
          {accountsQuery.error && !hasEnoughAccounts ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm"><p className="font-medium text-[var(--aries-danger)]">We could not load your accounts</p><p className="mt-1 leading-6 text-muted">Aries cannot confirm which accounts are available. Try again before continuing.</p><Button type="button" variant="secondary" className="mt-3" onClick={() => void accountsQuery.refetch()}>Try again</Button></div> : !accountsQuery.isPending && !hasEnoughAccounts && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-[var(--aries-warning)]">{draft.mode === "EXTERNAL" ? "You need one active VND account to transfer to another person." : "You need two active VND accounts to transfer between your accounts."}</p>}
        </div>}

        {draftStep === 2 && <div className="grid gap-5">
          <AccountSelect
            accounts={eligibleAccounts}
            value={draft.sourceAccountId}
            onChange={selectSource}
            label="Source account"
            id="transfer-source-account"
            isLoading={accountsQuery.isPending}
            isFetching={accountsQuery.isFetching}
            error={accountsQuery.error}
            onRetry={() => void accountsQuery.refetch()}
            disabled={formLocked}
            validationError={fieldErrors.sourceAccountId}
          />
          {draft.mode === "EXTERNAL" ? <Field
            id="transfer-recipient-account"
            label="Recipient account number"
            value={draft.recipientAccountNumber}
            onChange={recipientAccountNumber => updateDraft({ ...draft, recipientAccountNumber })}
            disabled={formLocked}
            inputMode="numeric"
            autoComplete="off"
            error={fieldErrors.recipientAccountNumber}
            required
          /> : <AccountSelect
            accounts={eligibleAccounts}
            value={draft.toAccountId}
            onChange={toAccountId => updateDraft({ ...draft, toAccountId })}
            label="Destination account"
            id="transfer-destination-account"
            excludeAccountId={draft.sourceAccountId}
            disabled={formLocked}
            isLoading={accountsQuery.isPending}
            validationError={fieldErrors.toAccountId}
          />}
          {accountsQuery.data && accountsQuery.data.length > eligibleAccounts.length && <p className="text-xs text-muted">Only active VND accounts can be used. Other accounts remain unchanged and are not shown in these selectors.</p>}
        </div>}

        {draftStep === 3 && <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="transfer-amount"
              label="Amount"
              value={draft.amount}
              onChange={amount => updateDraft({ ...draft, amount })}
              disabled={formLocked}
              inputMode="decimal"
              error={fieldErrors.amount}
              helper="Minimum 1000 VND; up to two decimal places."
              required
            />
            <Field id="transfer-currency" label="Currency" value="VND" onChange={() => undefined} disabled={formLocked} readOnly />
          </div>
          <Field
            id="transfer-description"
            label="Description"
            value={draft.description}
            onChange={description => updateDraft({ ...draft, description })}
            disabled={formLocked}
            maxLength={255}
            error={fieldErrors.description}
            helper="Optional, up to 255 characters."
          />
        </div>}
      </section>

      {formError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--aries-danger)]">{formError}</p>}
      {retrySeconds > 0 && <p role="status" className="text-sm text-[var(--aries-warning)]">Preview requests are available again in {retrySeconds} seconds.</p>}

      <div className="flex flex-wrap items-center gap-3">
        {draftStep > 1 && <Button type="button" variant="secondary" onClick={goBack} disabled={formLocked}>Back</Button>}
        {draftStep < 3 ? <Button type="submit" className="ml-auto" disabled={formLocked || accountsQuery.isPending || !hasEnoughAccounts}>Next</Button> : <Button type="submit" className="ml-auto" disabled={formLocked || !hasEnoughAccounts || retrySeconds > 0 || previewMutation.isPending}>
          {state.tag === "previewing" ? <><Clock3 aria-hidden="true" size={16} className="mr-2 animate-pulse" />Creating preview…</> : <>Review transfer <Send aria-hidden="true" size={16} /></>}
        </Button>}
      </div>
    </form>

    <section ref={statusRegionRef} tabIndex={-1} aria-labelledby="transfer-status-title" aria-live="polite" className="rounded-2xl border border-border bg-surface p-5 outline-none sm:p-6 lg:sticky lg:top-6">
      <StatusPanel
        state={state}
        now={now}
        transactionId={transactionId}
        transaction={transactionQuery.data ?? (state.tag === "result" ? state.transaction : undefined)}
        transactionPending={Boolean(transactionId && transactionQuery.isPending)}
        transactionError={transactionId ? transactionQuery.error : null}
        onRefreshTransaction={() => void transactionQuery.refetch()}
        onEdit={editDetails}
        onCreatePreview={() => void requestPreview()}
        onConfirm={() => void confirmOrRetry()}
        onStartAnother={startAnother}
      />
    </section>
  </div></AuthGate>;
}

function TransferStepIndicator({ currentStep }: { currentStep: DraftStep }) {
  return <ol className="grid grid-cols-3 gap-2" aria-label="Transfer steps">
    {draftSteps.map(step => {
      const reached = step.number <= currentStep;
      const current = step.number === currentStep;
      return <li key={step.number} aria-current={current ? "step" : undefined} className="min-w-0">
        <span aria-hidden="true" className={cn("block h-1 rounded-full", reached ? "bg-accent" : "bg-surface-muted")} />
        <span className="mt-2 flex items-center gap-2">
          <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold", reached ? "border-accent text-foreground" : "border-border text-muted")}>{step.number}</span>
          <span className={cn("min-w-0 text-xs font-medium sm:text-sm", current ? "text-foreground" : "text-muted")}><span className="sm:hidden">{step.shortLabel}</span><span className="hidden sm:inline">{step.label}</span></span>
        </span>
      </li>;
    })}
  </ol>;
}

function ModeButton({ selected, onClick, icon, title, detail }: { selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; detail: string }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={cn("flex min-h-16 items-start gap-3 rounded-xl border p-3 text-left transition-colors", selected ? "border-accent bg-surface-muted" : "border-border bg-surface hover:bg-surface-muted")}>
    <span className={cn("mt-0.5", selected ? "text-accent" : "text-muted")}>{icon}</span>
    <span><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs text-muted">{detail}</span></span>
  </button>;
}

function Field({ id, label, value, onChange, disabled, inputMode, autoComplete, required, readOnly, maxLength, error, helper }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  inputMode?: "decimal" | "numeric";
  autoComplete?: string;
  required?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  error?: string;
  helper?: string;
}) {
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  return <label htmlFor={id} className="block text-sm font-medium">{label}
    <input id={id} required={required} value={value} onChange={event => onChange(event.target.value)} disabled={disabled} inputMode={inputMode} autoComplete={autoComplete} readOnly={readOnly} maxLength={maxLength} aria-invalid={Boolean(error)} aria-describedby={[helper ? descriptionId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined} className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted read-only:bg-surface-muted" />
    {helper && <span id={descriptionId} className="mt-1 block text-xs font-normal text-muted">{helper}</span>}
    {error && <span id={errorId} role="alert" className="mt-1 block text-xs font-normal text-[var(--aries-danger)]">{error}</span>}
  </label>;
}

function StatusPanel({ state, now, transactionId, transaction, transactionPending, transactionError, onRefreshTransaction, onEdit, onCreatePreview, onConfirm, onStartAnother }: {
  state: TransferWorkflowState;
  now: number;
  transactionId?: string;
  transaction?: Transaction;
  transactionPending: boolean;
  transactionError: Error | null;
  onRefreshTransaction: () => void;
  onEdit: () => void;
  onCreatePreview: () => void;
  onConfirm: () => void;
  onStartAnother: () => void;
}) {
  if (transactionId || state.tag === "result") {
    return <TransactionResult transaction={transaction} isPending={transactionPending} error={transactionError} onRefresh={onRefreshTransaction} onStartAnother={onStartAnother} />;
  }
  if (state.tag === "previewing") return <MessageState icon={<Clock3 aria-hidden="true" className="animate-pulse text-[var(--aries-pending)]" size={20} />} title="Creating verified preview" detail="The backend is checking ownership, recipient availability, currency, amount, and total debit. Nothing has been sent." />;
  if (state.tag === "review" || state.tag === "executing") return <PreviewReview state={state} now={now} onEdit={onEdit} onConfirm={onConfirm} />;
  if (state.tag === "expired") return <MessageState icon={<Clock3 aria-hidden="true" className="text-[var(--aries-warning)]" size={20} />} title="Preview unavailable" detail={state.message} tone="warning" actions={<><Button type="button" onClick={onCreatePreview}>Create new preview</Button><Button type="button" variant="secondary" onClick={onEdit}>Edit details</Button></>} />;
  if (state.tag === "unknown") return <MessageState icon={<ShieldAlert aria-hidden="true" className="text-[var(--aries-warning)]" size={20} />} title="Transfer status unavailable" detail="Aries could not confirm whether the backend completed this transfer. Do not start another transfer. Check safely with the same preview and idempotency key." tone="warning" requestId={state.requestId} actions={<><Button type="button" onClick={onConfirm}>Check safely</Button><TransactionHistoryLink accountId={state.draft.sourceAccountId} /></>} />;
  if (state.tag === "rejected") return <MessageState icon={<XCircle aria-hidden="true" className="text-[var(--aries-danger)]" size={20} />} title={state.blocked ? "Transfer needs investigation" : "Transfer rejected"} detail={state.message} tone="danger" requestId={state.requestId} actions={state.blocked ? <TransactionHistoryLink accountId={state.draft.sourceAccountId} /> : <><Button type="button" variant="secondary" onClick={onEdit}>Review details</Button><TransactionHistoryLink accountId={state.draft.sourceAccountId} /></>} />;
  return <MessageState icon={<ShieldAlert aria-hidden="true" className="text-[var(--aries-warning)]" size={20} />} title="Before you send" detail="Your backend-verified masked review will appear here. A preview does not move money, and a submitted transfer is not completed until its transaction status confirms it." />;
}

function PreviewReview({ state, now, onEdit, onConfirm }: { state: Extract<TransferWorkflowState, { tag: "review" | "executing" }>; now: number; onEdit: () => void; onConfirm: () => void }) {
  const preview = state.preview;
  const remainingSeconds = Math.max(0, Math.ceil((Date.parse(preview.expiresAt) - now) / 1_000));
  return <div>
    <div className="flex items-start gap-3"><ShieldAlert aria-hidden="true" className="mt-0.5 text-[var(--aries-warning)]" size={20} /><div><h2 id="transfer-status-title" className="font-semibold">Review before sending</h2><p className="mt-1 text-sm leading-6 text-muted">This preview is authoritative. Confirming requests the transfer once; completion still comes from the transaction status.</p></div></div>
    <dl className="mt-5 space-y-3 rounded-xl bg-surface-muted p-4 text-sm">
      <ReviewAccount label="From" account={preview.source} />
      <ReviewAccount label="To" account={preview.recipient} />
      <ReviewItem label="Amount" value={formatMoney(preview.amount, preview.currency)} strong />
      <ReviewItem label="Fee" value={formatMoney(preview.fee, preview.currency)} />
      <ReviewItem label="Total debit" value={formatMoney(preview.debitTotal, preview.currency)} strong />
      <ReviewItem label="Currency" value={preview.currency} />
      <ReviewItem label="Description" value={state.draft.description.trim() || "None"} />
    </dl>
    {preview.warnings.length > 0 && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-[var(--aries-warning)]"><p className="font-semibold">Review these warnings</p><ul className="mt-2 list-disc space-y-1 pl-5">{preview.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></div>}
    <p role="status" className="mt-4 flex items-center gap-2 text-sm text-[var(--aries-warning)]"><Clock3 aria-hidden="true" size={15} />Expires at {formatTimestamp(preview.expiresAt)} · {formatCountdown(remainingSeconds)} remaining</p>
    {state.tag === "executing" && <p role="status" className="mt-3 text-sm text-[var(--aries-pending)]">Submitting… The backend has not confirmed the result yet.</p>}
    <div className="mt-6 flex flex-wrap gap-2"><Button type="button" onClick={onConfirm} disabled={state.tag === "executing"}>{state.tag === "executing" ? "Submitting…" : "Confirm and send"}</Button><Button type="button" variant="secondary" onClick={onEdit} disabled={state.tag === "executing"}>Edit details</Button></div>
  </div>;
}

function TransactionResult({ transaction, isPending, error, onRefresh, onStartAnother }: { transaction?: Transaction; isPending: boolean; error: Error | null; onRefresh: () => void; onStartAnother: () => void }) {
  if (isPending && !transaction) return <MessageState icon={<RefreshCw aria-hidden="true" className="animate-spin text-[var(--aries-pending)]" size={20} />} title="Loading transaction status" detail="Aries is reading the authoritative transaction record. No status is being inferred locally." />;
  if (error && !transaction) return <MessageState icon={<AlertTriangle aria-hidden="true" className="text-[var(--aries-danger)]" size={20} />} title="Transaction status unavailable" detail="The transaction record could not be loaded. Aries will not guess whether it completed." tone="danger" actions={<Button type="button" variant="secondary" onClick={onRefresh}>Try again</Button>} />;
  if (!transaction) return <MessageState icon={<AlertTriangle aria-hidden="true" className="text-[var(--aries-warning)]" size={20} />} title="Transaction status unavailable" detail="No authoritative transaction record is available." tone="warning" />;
  const lifecycle = toTransactionLifecycle(transaction);
  const completed = lifecycle.kind === "succeeded";
  const failed = lifecycle.kind === "failed";
  return <div>
    <div className="flex items-start gap-3">{completed ? <CheckCircle2 aria-hidden="true" className="mt-0.5 text-[var(--aries-success)]" size={20} /> : failed ? <XCircle aria-hidden="true" className="mt-0.5 text-[var(--aries-danger)]" size={20} /> : <Clock3 aria-hidden="true" className="mt-0.5 text-[var(--aries-pending)]" size={20} />}<div><h2 id="transfer-status-title" className="font-semibold">{completed ? "Transfer completed" : failed ? "Transfer failed" : lifecycle.kind === "pending" ? "Transfer processing" : "Transaction status"}</h2><p className="mt-1 text-sm leading-6 text-muted">{completed ? "The backend confirmed this transaction as completed." : failed ? "The backend confirmed this transaction failed." : lifecycle.kind === "pending" ? "The backend accepted the transaction, but it is not completed yet." : "This is the latest status returned by the backend."}</p></div></div>
    <dl className="mt-5 space-y-3 rounded-xl bg-surface-muted p-4 text-sm"><div className="flex items-center justify-between gap-4"><dt className="text-muted">Status</dt><dd><TransactionStatusBadge transaction={transaction} /></dd></div><ReviewItem label="Amount" value={formatMoney(transaction.amount, transaction.currency)} strong /><ReviewItem label="Transaction" value={transaction.id} mono /><ReviewItem label="Created" value={formatTimestamp(transaction.createdAt)} />{transaction.completedAt && <ReviewItem label="Completed" value={formatTimestamp(transaction.completedAt)} />}</dl>
    {error && <p role="alert" className="mt-4 text-sm text-[var(--aries-warning)]">The status could not be refreshed, so the last authoritative transaction data remains visible.</p>}
    <div className="mt-6 flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={onRefresh}>Refresh status</Button><Button type="button" variant="ghost" onClick={onStartAnother}>Start another transfer</Button></div>
  </div>;
}

function MessageState({ icon, title, detail, tone = "neutral", actions, requestId }: { icon: React.ReactNode; title: string; detail: string; tone?: "neutral" | "warning" | "danger"; actions?: React.ReactNode; requestId?: string }) {
  return <div role={tone === "danger" ? "alert" : undefined}><div className="flex items-start gap-3">{icon}<div><h2 id="transfer-status-title" className="font-semibold">{title}</h2><p className={cn("mt-2 text-sm leading-6", tone === "danger" ? "text-[var(--aries-danger)]" : tone === "warning" ? "text-[var(--aries-warning)]" : "text-muted")}>{detail}</p>{requestId && <p className="mt-3 text-xs text-muted">Support request ID: <span className="font-mono">{requestId}</span></p>}</div></div>{actions && <div className="mt-6 flex flex-wrap gap-2">{actions}</div>}</div>;
}

function ReviewAccount({ label, account }: { label: string; account: TransferPreview["source"] }) {
  return <div className="flex justify-between gap-4"><dt className="text-muted">{label}</dt><dd className="text-right"><span className="block font-medium">{account.displayName}</span><span className="font-mono text-xs text-muted">{account.accountNumberMasked}</span></dd></div>;
}

function ReviewItem({ label, value, strong, mono }: { label: string; value: string; strong?: boolean; mono?: boolean }) {
  return <div className="flex justify-between gap-4"><dt className="text-muted">{label}</dt><dd className={cn("break-all text-right", strong && "font-semibold tabular-nums", mono && "font-mono text-xs")}>{value}</dd></div>;
}

function TransactionHistoryLink({ accountId }: { accountId: string }) {
  const href = accountId ? `/transactions?accountId=${encodeURIComponent(accountId)}` : "/transactions";
  return <Link href={href as Route} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted">View transaction history</Link>;
}

function toRouteMode(draft: TransferDraft): TransferRouteMode {
  return draft.mode === "OWN_ACCOUNTS" ? "own-accounts" : "external";
}

function newIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `aries-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(date) : "Unavailable";
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function focusFirstInvalidField() {
  window.setTimeout(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(), 0);
}

function focusStatusRegion(ref: React.RefObject<HTMLElement | null>) {
  window.setTimeout(() => ref.current?.focus(), 0);
}

function stepForFieldErrors(errors: TransferFieldErrors): DraftStep {
  return errors.sourceAccountId || errors.recipientAccountNumber || errors.toAccountId ? 2 : 3;
}

function previewErrorStep(error: unknown, fieldErrors: TransferFieldErrors): DraftStep {
  if (Object.keys(fieldErrors).length > 0) return stepForFieldErrors(fieldErrors);
  return error instanceof ApiError && ["RECIPIENT_UNAVAILABLE", "FORBIDDEN"].includes(error.code ?? "") ? 2 : 3;
}
