"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { ReceiveQr } from "@/features/qr/components/receive-qr";
import { QrReader } from "@/features/qr/components/qr-reader";
import type { ResolvedQr } from "@/features/qr/api";
import { readTransferRecovery, type TransferRecovery } from "../recovery";
import { useExecuteTransferPreview } from "../mutations";
import { executeErrorDecision } from "../validation";
import type { TransferSearchParams } from "../search-params";
import { TransferWorkflow, TransactionResult } from "./transfer-workflow";
import type { Transaction } from "@/features/transactions/types";
import { useTransactionDetail } from "@/features/transactions/queries";
import { Button } from "@/components/ui/button";
import { useCooldown } from "@/features/auth/use-security-operation";
import { ApiError } from "@/lib/api/errors";

export function TransfersWorkspace({ params }: { params: TransferSearchParams }) {
  const session = useAuthSession();
  if (!session.user) return null;
  return <UserTransfers key={`${session.user.id}:${params.view ?? "send"}`} userId={session.user.id} params={params} />;
}
function UserTransfers({ userId, params }: { userId: string; params: TransferSearchParams }) {
  const router = useRouter(); const [recovery, setRecovery] = useState<TransferRecovery | null>();
  const [resolved, setResolved] = useState<ResolvedQr>(); const [busy, setBusy] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setRecovery(readTransferRecovery(userId)), 0); return () => window.clearTimeout(timer); }, [userId]);
  const view = params.view ?? "send";
  if (recovery === undefined) return <p role="status">Checking for an unfinished transfer…</p>;
  if (recovery) return <RecoverTransfer recovery={recovery} onDone={() => { setRecovery(null); router.replace("/transfers" as Route); }} />;
  return <div className="space-y-6">
    <nav aria-label="Transfer actions" className="flex flex-wrap gap-2">{([ ["send", "Send transfer"], ["pay-qr", "Pay QR"], ["receive", "Receive QR"] ] as const).map(([value, label]) => <Button key={value} type="button" variant={view === value ? "primary" : "secondary"} aria-current={view === value ? "page" : undefined} disabled={busy} onClick={() => router.replace(`/transfers?view=${value}` as Route)}>{label}</Button>)}</nav>
    {view === "receive" ? <ReceiveQr key={`${params.accountId}:${params.page}`} accountId={params.accountId} page={params.page} initialQrId={params.qrId} onBusyChange={setBusy} /> : view === "pay-qr" && !resolved && !params.transactionId ? <QrReader onResolved={setResolved} /> : <>
      {view === "pay-qr" && resolved && !busy && !params.transactionId && <Button type="button" variant="secondary" onClick={() => setResolved(undefined)}>Read another QR</Button>}
      <TransferWorkflow qr={resolved} routeMode={params.mode} initialAccountId={params.accountId} transactionId={params.transactionId} onBusyChange={setBusy} />
    </>}
  </div>;
}
function RecoverTransfer({ recovery, onDone }: { recovery: TransferRecovery; onDone: () => void }) {
  const mutation = useExecuteTransferPreview(); const cooldown = useCooldown(); const lock = useRef(false);
  const [transaction, setTransaction] = useState<Transaction>(); const [message, setMessage] = useState(""); const [rejected, setRejected] = useState(false);
  const detail = useTransactionDetail(transaction?.id);
  async function check() {
    if (lock.current || cooldown.seconds) return;
    lock.current = true; setMessage("");
    try { const result = await mutation.mutateAsync({ previewId: recovery.previewId, idempotencyKey: recovery.idempotencyKey, ...(recovery.authorizationId ? { authorizationId: recovery.authorizationId } : {}) }); setTransaction(result); }
    catch (error) {
      const decision = executeErrorDecision(error);
      setMessage(decision.kind === "unknown" ? "The result is still unconfirmed. Check the same request when the service is available, or review transaction history and contact support." : decision.message);
      setRejected(decision.kind !== "unknown" && !(decision.kind === "rejected" && decision.blocked));
      if (error instanceof ApiError && error.retryAfterSeconds) cooldown.start(error.retryAfterSeconds);
    } finally { lock.current = false; }
  }
  if (transaction) return <section className="rounded-2xl border border-border bg-surface p-6"><TransactionResult transaction={detail.data ?? transaction} isPending={detail.isPending} error={detail.error} onRefresh={() => void detail.refetch()} onStartAnother={onDone} /></section>;
  return <section aria-labelledby="recovery-title" className="space-y-4 rounded-2xl border border-border bg-surface p-6"><h2 id="recovery-title" className="text-xl font-semibold">Check your unfinished transfer</h2><p>The previous request may have completed. Check it using the same preview and idempotency key before starting another transfer.</p><p className="text-sm text-muted">No OTP or payment details were stored in this tab.</p>{message && <p role="alert">{message}</p>}{rejected ? <Button type="button" onClick={onDone}>Return to transfers</Button> : <Button type="button" disabled={mutation.isPending || cooldown.seconds > 0} onClick={() => void check()}>{mutation.isPending ? "Checking transfer…" : cooldown.seconds ? `Try again in ${cooldown.seconds}s` : "Check safely"}</Button>}<Link href="/transactions" className="block text-sm underline">View transaction history</Link></section>;
}
