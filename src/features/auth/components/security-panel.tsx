"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { SecurityFeedback } from "@/features/auth/components/security-feedback";
import { changePassword, logoutAll, type ChangePasswordRequest } from "@/features/auth/security-api";
import { newPasswordError } from "@/features/auth/password-policy";
import { useCooldown, useSecurityOperation } from "@/features/auth/use-security-operation";
import type { SecurityFailure } from "@/features/auth/security-errors";

export function SecurityPanel() {
  const session = useAuthSession();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [validation, setValidation] = useState<Record<string, string | undefined>>({});
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const lock = useRef(false);
  const confirmationRef = useRef<HTMLDivElement>(null);
  const logoutButton = useRef<HTMLButtonElement>(null);
  const cooldown = useCooldown();

  function finish(message: string) {
    setCurrentPassword(""); setNewPassword(""); setConfirmation("");
    session.endSecuritySession({ tone: "success", message });
    router.replace("/login" as Route);
  }
  function rejected(failure: SecurityFailure) {
    if (failure.kind === "rejected") lock.current = false;
    if (failure.kind === "unknown") { setCurrentPassword(""); setNewPassword(""); setConfirmation(""); }
    if (failure.retryAfterSeconds) cooldown.start(failure.retryAfterSeconds);
  }
  const change = useSecurityOperation((input: ChangePasswordRequest) => changePassword(input, session.request), () => finish("Your password has changed and all sessions revoked. Sign in with your new password."), rejected);
  const signOut = useSecurityOperation(() => logoutAll(session.request), () => finish("You have been signed out of all devices. Sign in again to continue."), rejected);
  const failure = change.error ?? signOut.error;
  const pending = change.isPending || signOut.isPending;
  const terminal = failure != null && failure.kind !== "rejected";
  useEffect(() => { if (confirmLogout) confirmationRef.current?.focus(); }, [confirmLogout]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || cooldown.seconds || terminal) return;
    const errors = {
      currentPassword: !currentPassword ? "Enter your current password." : undefined,
      newPassword: newPasswordError(newPassword) ?? (newPassword === currentPassword ? "Choose a password different from your current password." : undefined),
      confirmation: newPassword !== confirmation ? "Passwords do not match." : undefined,
    };
    setValidation(errors);
    if (Object.values(errors).some(Boolean)) return;
    lock.current = true;
    signOut.reset();
    change.submit({ currentPassword, newPassword });
  }

  async function check() {
    if (checking) return;
    setChecking(true);
    const result = await session.checkSession();
    setCheckResult(result === "active" ? "This session is still active. The logout-all outcome remains unconfirmed." : result === "ended" ? "This session has ended. The logout-all outcome remains unconfirmed." : "Session status could not be checked. The logout-all outcome remains unconfirmed.");
    setChecking(false);
    if (result === "ended") router.replace("/login" as Route);
  }

  const fieldError = (field: string) => validation[field] ?? (failure?.field === field ? failure.message : undefined);
  const disabled = pending || terminal || change.isSuccess || signOut.isSuccess;
  return <section aria-labelledby="security-title" className="rounded-2xl border border-border bg-surface p-6 lg:p-8">
    <header><p className="text-sm font-medium text-accent">Security</p><h2 id="security-title" className="mt-1 text-xl font-semibold">Password and sign-in access</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Manage your password and end access on every device, including this one.</p></header>
    <div className="mt-6 max-w-lg space-y-8">
      <form onSubmit={submit} noValidate className="space-y-5" aria-busy={change.isPending}>
        <h3 className="font-semibold">Change password</h3>
        <SecurityPasswordField id="current-password" label="Current password" autoComplete="current-password" value={currentPassword} onChange={setCurrentPassword} error={fieldError("currentPassword")} disabled={disabled} />
        <SecurityPasswordField id="new-password" label="New password" autoComplete="new-password" value={newPassword} onChange={setNewPassword} error={fieldError("newPassword")} disabled={disabled} help="At least 8 characters, at most 72 UTF-8 bytes. Some characters use more than one byte." />
        <SecurityPasswordField id="confirm-new-password" label="Confirm new password" autoComplete="new-password" value={confirmation} onChange={setConfirmation} error={fieldError("confirmation")} disabled={disabled} />
        <p className="text-sm leading-6 text-muted">Changing your password revokes all sessions. You will need to sign in again on this device and every other device.</p>
        <Button type="submit" disabled={disabled || cooldown.seconds > 0}>{change.isPending ? "Changing password…" : cooldown.seconds ? `Try again in ${cooldown.seconds}s` : "Change password"}</Button>
      </form>
      <div className="space-y-4 border-t border-border pt-6">
        <div><h3 className="font-semibold">Sign out of all devices</h3><p className="mt-2 text-sm leading-6 text-muted">End every sign-in session without changing your password. This does not cancel transactions already being processed.</p></div>
        {!confirmLogout ? <Button ref={logoutButton} type="button" variant="secondary" disabled={disabled || cooldown.seconds > 0} onClick={() => setConfirmLogout(true)}>Sign out of all devices</Button> : <div ref={confirmationRef} tabIndex={-1} role="group" aria-label="Confirm sign out of all devices" className="space-y-4 rounded-lg bg-surface-muted p-4"><p className="text-sm leading-6">You will be signed out everywhere, including this device. You must sign in again to continue.</p><div className="flex flex-wrap gap-3"><Button type="button" variant="secondary" disabled={pending} onClick={() => { setConfirmLogout(false); window.requestAnimationFrame(() => logoutButton.current?.focus()); }}>Cancel</Button><Button type="button" variant="danger" disabled={disabled || cooldown.seconds > 0} onClick={() => { if (lock.current) return; lock.current = true; change.reset(); signOut.submit(undefined); }}>{signOut.isPending ? "Signing out…" : "Confirm sign out everywhere"}</Button></div></div>}
      </div>
      <SecurityFeedback failure={failure} id="security-error" />
      {pending && <p role="status" className="text-sm text-muted">Waiting for the service to confirm the operation. Do not submit again.</p>}
      {failure?.kind === "unknown" && <div className="space-y-4">
        {signOut.error?.kind === "unknown" && <Button type="button" variant="secondary" disabled={checking} onClick={() => void check()}>{checking ? "Checking session…" : "Check this session"}</Button>}
        {checkResult && <p role="status" className="text-sm leading-6 text-muted">{checkResult}</p>}
        <Button type="button" variant="secondary" onClick={() => { session.endSecuritySession({ tone: "warning", message: "The security operation outcome is unconfirmed. Sign in normally or request a new password reset link." }, false); router.replace("/login" as Route); }}>Go to sign in</Button>
      </div>}
    </div>
  </section>;
}

function SecurityPasswordField({ id, label, autoComplete, value, onChange, error, disabled, help }: { id: string; label: string; autoComplete: string; value: string; onChange: (value: string) => void; error?: string; disabled: boolean; help?: string }) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-medium">{label}</label><PasswordInput id={id} name={id} visibilityLabel={label.toLowerCase()} autoComplete={autoComplete} required value={value} onChange={event => onChange(event.target.value)} disabled={disabled} aria-invalid={Boolean(error)} aria-describedby={error || help ? `${id}-help` : undefined} />{(error || help) && <p id={`${id}-help`} role={error ? "alert" : undefined} className={`mt-2 text-xs leading-5 ${error ? "text-[var(--aries-danger)]" : "text-muted"}`}>{error ?? help}</p>}</div>;
}
