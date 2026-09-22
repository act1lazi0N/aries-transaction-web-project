"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { SecurityFeedback } from "@/features/auth/components/security-feedback";
import { newPasswordError } from "@/features/auth/password-policy";
import { resetPassword } from "@/features/auth/security-api";
import { useCooldown, useSecurityOperation } from "@/features/auth/use-security-operation";

export function ResetPasswordForm() {
  const session = useAuthSession();
  const router = useRouter();
  const captured = useRef(false);
  const token = useRef<string | null>(null);
  const [linkState, setLinkState] = useState<"loading" | "ready" | "missing">("loading");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [validation, setValidation] = useState<{ password?: string; confirmation?: string }>({});
  const cooldown = useCooldown();
  const operation = useSecurityOperation(resetPassword, () => {
    token.current = null; setPassword(""); setConfirmation("");
    session.endSecuritySession({ tone: "success", message: "Your password has been reset and all sessions revoked. Sign in with your new password." });
    router.replace("/login" as Route);
  }, failure => {
    if (failure.retryAfterSeconds) cooldown.start(failure.retryAfterSeconds);
    if (failure.kind === "invalid-token" || failure.kind === "unknown") { token.current = null; setPassword(""); setConfirmation(""); }
  });
  useEffect(() => {
    if (captured.current) return;
    captured.current = true;
    const url = new URL(window.location.href);
    const tokens = url.searchParams.getAll("token");
    token.current = tokens.length === 1 && tokens[0].length > 0 && tokens[0].length <= 200 ? tokens[0] : null;
    window.history.replaceState(window.history.state, "", "/reset-password");
    setLinkState(token.current ? "ready" : "missing");
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token.current || operation.isPending || cooldown.seconds) return;
    const errors = { password: newPasswordError(password) ?? undefined, confirmation: password !== confirmation ? "Passwords do not match." : undefined };
    setValidation(errors);
    if (errors.password || errors.confirmation) return;
    operation.submit({ token: token.current, newPassword: password });
  }
  if (linkState === "loading") return <p role="status" className="text-sm text-muted">Preparing your reset form…</p>;
  if (linkState === "missing") return <div className="space-y-4"><p role="alert" className="text-sm leading-6 text-muted">This page needs the complete reset link. Open it from your email, or request a new one. No password change was requested.</p><Link href={"/forgot-password" as Route} className="inline-flex min-h-11 items-center font-semibold text-accent">Request a new reset link</Link></div>;
  const terminal = operation.error != null && operation.error.kind !== "rejected";
  const passwordError = validation.password ?? (operation.error?.field === "newPassword" ? operation.error.message : undefined);
  return <form onSubmit={submit} noValidate className="space-y-5" aria-busy={operation.isPending}>
    {!terminal && <>
      <div><label htmlFor="reset-password" className="mb-2 block text-sm font-medium">New password</label><PasswordInput id="reset-password" visibilityLabel="new password" name="newPassword" autoComplete="new-password" required value={password} disabled={operation.isPending} onChange={event => setPassword(event.target.value)} aria-invalid={Boolean(passwordError)} aria-describedby="reset-password-help" /><p id="reset-password-help" role={passwordError ? "alert" : undefined} className={`mt-2 text-xs leading-5 ${passwordError ? "text-[var(--aries-danger)]" : "text-muted"}`}>{passwordError ?? "At least 8 characters, at most 72 UTF-8 bytes. Do not reuse your current password."}</p></div>
      <div><label htmlFor="reset-confirmation" className="mb-2 block text-sm font-medium">Confirm new password</label><PasswordInput id="reset-confirmation" visibilityLabel="password confirmation" name="confirmPassword" autoComplete="new-password" required value={confirmation} disabled={operation.isPending} onChange={event => setConfirmation(event.target.value)} aria-invalid={Boolean(validation.confirmation)} aria-describedby={validation.confirmation ? "reset-confirmation-error" : undefined} />{validation.confirmation && <p id="reset-confirmation-error" role="alert" className="mt-2 text-sm text-[var(--aries-danger)]">{validation.confirmation}</p>}</div>
      <p className="text-sm leading-6 text-muted">Resetting your password signs you out on every device, including this one. You will need to sign in again.</p>
    </>}
    <SecurityFeedback failure={operation.error} id="reset-error" />
    {operation.error?.kind === "unknown" && <Button type="button" variant="secondary" onClick={() => { session.endSecuritySession({ tone: "warning", message: "The password reset outcome is unconfirmed. Try signing in with your new password, or request a fresh reset link." }, false); router.replace("/login" as Route); }}>Go to sign in</Button>}
    {!terminal && <Button type="submit" className="w-full" disabled={operation.isPending || cooldown.seconds > 0 || operation.isSuccess}>{operation.isPending ? "Resetting password…" : cooldown.seconds ? `Try again in ${cooldown.seconds}s` : "Reset password"}</Button>}
    {operation.isPending && <p role="status" className="text-sm text-muted">Waiting for confirmation. Do not submit again.</p>}
  </form>;
}
