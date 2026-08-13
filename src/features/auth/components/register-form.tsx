"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { userFacingErrorMessage } from "@/lib/api/errors";

export function RegisterForm() {
  const router = useRouter();
  const session = useAuthSession();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => { if (session.status === "authenticated") router.replace("/"); }, [router, session.status]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim();
    if (!normalizedName || !normalizedEmail || !password || !confirmPassword) {
      setFormError("Complete all required fields.");
      return;
    }
    if (password.length < 8 || password.length > 72) {
      setFormError("Password must be between 8 and 72 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    try {
      await session.signUp({ fullName: normalizedName, email: normalizedEmail, password });
    } catch (error) {
      setFormError(userFacingErrorMessage(error, "Registration failed. Try again."));
    }
  }

  const inputClassName = "h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent";

  return <form onSubmit={submit} noValidate className="space-y-5" aria-describedby={formError ? "register-error" : undefined}>
    <div><label htmlFor="fullName" className="mb-2 block text-sm font-medium">Full name</label><input id="fullName" name="fullName" type="text" autoComplete="name" maxLength={100} value={fullName} onChange={event => setFullName(event.target.value)} className={inputClassName} /></div>
    <div><label htmlFor="register-email" className="mb-2 block text-sm font-medium">Email</label><input id="register-email" name="email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className={inputClassName} /></div>
    <div><label htmlFor="register-password" className="mb-2 block text-sm font-medium">Password</label><input id="register-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={password} onChange={event => setPassword(event.target.value)} className={inputClassName} /></div>
    <div><label htmlFor="confirm-password" className="mb-2 block text-sm font-medium">Confirm password</label><input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className={inputClassName} /></div>
    {formError && <p id="register-error" role="alert" className="text-sm text-[var(--aries-danger)]">{formError}</p>}
    <Button type="submit" className="w-full" disabled={session.status === "loading"}>{session.status === "loading" ? "Creating account…" : "Create account"}</Button>
    <p className="text-center text-sm text-muted">Already registered? <Link href="/login" className="font-semibold text-accent hover:underline">Sign in</Link></p>
  </form>;
}
