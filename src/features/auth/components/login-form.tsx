"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { userFacingErrorMessage } from "@/lib/api/errors";
import { authRouteWithReturnTo } from "@/features/auth/routes";

export function LoginForm({ returnTo }: Readonly<{ returnTo: string }>) {
  const router = useRouter();
  const session = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { if (session.status === "authenticated") router.replace(returnTo as Route); }, [returnTo, router, session.status]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFormError(null);
    if (!email.trim() || !password) { setFormError("Enter your email and password."); return; }
    setIsSubmitting(true);
    try { await session.signIn({ email: email.trim(), password }); }
    catch (error) { setFormError(userFacingErrorMessage(error, "Sign in failed. Check your details and try again.")); }
    finally { setIsSubmitting(false); }
  }

  return <form onSubmit={submit} noValidate className="space-y-5" aria-describedby={formError ? "login-error" : undefined}>
    <div><label htmlFor="email" className="mb-2 block text-sm font-medium">Work email</label><input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required value={email} onChange={event => setEmail(event.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-accent" /></div>
    <div><div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="text-sm font-medium">Password</label><span className="text-xs text-muted">8–72 characters</span></div><input id="password" name="password" type="password" autoComplete="current-password" minLength={8} maxLength={72} required value={password} onChange={event => setPassword(event.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-accent" /></div>
    {formError && <p id="login-error" role="alert" className="text-sm text-[var(--aries-danger)]">{formError}</p>}
    <Button type="submit" className="w-full" disabled={session.status === "loading" || isSubmitting}>{isSubmitting ? "Signing in…" : session.status === "loading" ? "Checking session…" : "Continue securely"}</Button>
    <p className="text-center text-sm text-muted">Need a new workspace identity? <Link href={authRouteWithReturnTo("/register", returnTo) as Route} className="font-semibold text-accent hover:underline">Create an account</Link></p>
  </form>;
}
