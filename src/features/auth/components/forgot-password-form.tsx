"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { forgotPassword } from "@/features/auth/security-api";
import { useCooldown, useSecurityOperation } from "@/features/auth/use-security-operation";
import { SecurityFeedback } from "@/features/auth/components/security-feedback";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const cooldown = useCooldown();
  const operation = useSecurityOperation(forgotPassword, () => { setAccepted(true); cooldown.start(60); }, failure => {
    if (failure.retryAfterSeconds) cooldown.start(failure.retryAfterSeconds);
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cooldown.seconds || operation.isPending || accepted) return;
    const normalized = email.trim();
    if (!normalized || normalized.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) { setValidation("Enter a valid email address."); return; }
    setValidation(null);
    operation.submit({ email: normalized });
  }

  if (accepted) return <div className="space-y-5">
    <div role="status"><h2 className="font-semibold">Request accepted</h2><p className="mt-2 text-sm leading-6 text-muted">If an eligible account exists, password reset instructions will be emailed. Acceptance does not confirm delivery. Check your inbox and spam folder.</p></div>
    <p className="text-sm leading-6 text-muted">An accepted resend may replace your earlier link. Use the latest email.</p>
    <Button type="button" variant="secondary" disabled={cooldown.seconds > 0} onClick={() => { setAccepted(false); operation.restart(); }}>{cooldown.seconds > 0 ? `Request again in ${cooldown.seconds}s` : "Request another link"}</Button>
  </div>;

  const blocked = operation.isPending || cooldown.seconds > 0 || (operation.error != null && operation.error.kind !== "rejected");
  return <form onSubmit={submit} noValidate className="space-y-5" aria-busy={operation.isPending}>
    <div><label htmlFor="recovery-email" className="mb-2 block text-sm font-medium">Email address</label><Input id="recovery-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} maxLength={255} required disabled={operation.isPending} onChange={event => setEmail(event.target.value)} aria-invalid={Boolean(validation || operation.error?.field === "email")} aria-describedby={validation ? "recovery-email-error" : operation.error ? "forgot-error" : undefined} className="h-11" />{validation && <p id="recovery-email-error" role="alert" className="mt-2 text-sm text-[var(--aries-danger)]">{validation}</p>}</div>
    <SecurityFeedback failure={operation.error ? { ...operation.error, message: operation.error.kind === "unknown" ? "The service did not confirm whether this email request was accepted. Wait before starting a fresh request from sign in." : operation.error.message } : null} id="forgot-error" recoveryLink={false} />
    {operation.error?.kind === "unknown" && <p className="text-sm text-muted">This email request may already have been accepted. Wait before starting a fresh request.</p>}
    <Button type="submit" className="w-full" disabled={blocked}>{operation.isPending ? "Requesting instructions…" : cooldown.seconds ? `Try again in ${cooldown.seconds}s` : "Send reset instructions"}</Button>
    {operation.isPending && <p role="status" className="text-sm text-muted">Waiting for the service to accept your request…</p>}
  </form>;
}
