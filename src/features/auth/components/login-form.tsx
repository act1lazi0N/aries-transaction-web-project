"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { ApiError, userFacingErrorMessage } from "@/lib/api/errors";
import { authRouteWithReturnTo, resolveAuthorizedRouteForRole } from "@/features/auth/routes";

export function LoginForm({ returnTo }: Readonly<{ returnTo: string }>) {
  const router = useRouter();
  const session = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (session.status === "authenticated") router.replace(resolveAuthorizedRouteForRole(returnTo, session.user?.role) as Route);
  }, [returnTo, router, session.status, session.user?.role]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFormError(null);
    if (!email.trim() || !password) { setFormError("Enter your email address and password."); return; }
    setIsSubmitting(true);
    try { await session.signIn({ email: email.trim(), password }); }
    catch (error) {
      if (error instanceof ApiError && error.status === 403 && error.code === "ACCOUNT_SUSPENDED") {
        setFormError("Your account is suspended. Contact support for help.");
      } else {
        setFormError(error instanceof ApiError && error.kind === "unauthorized" ? "The email or password is incorrect. Check your details and try again." : userFacingErrorMessage(error, "We could not sign you in. Check your details and try again."));
      }
    }
    finally { setIsSubmitting(false); }
  }

  return <form onSubmit={submit} noValidate className="space-y-5" aria-describedby={formError ? "login-error" : undefined}>
    {session.notice && <p role="status" className={`text-sm leading-6 ${session.notice.tone === "success" ? "text-[var(--aries-success)]" : "text-[var(--aries-warning)]"}`}>{session.notice.message}</p>}
    <div><label htmlFor="email" className="mb-2 block text-sm font-medium">Work email</label><input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required value={email} onChange={event => setEmail(event.target.value)} className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition-colors focus:border-accent" /></div>
    <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><label htmlFor="password" className="text-sm font-medium">Password</label><Link href={"/forgot-password" as Route} className="inline-flex min-h-10 items-center rounded text-sm font-medium text-accent hover:underline">Forgot password?</Link></div><PasswordInput id="password" name="password" visibilityLabel="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></div>
    {formError && <p id="login-error" role="alert" className="text-sm text-[var(--aries-danger)]">{formError}</p>}
    <Button type="submit" className="w-full" disabled={session.status === "loading" || isSubmitting}>{isSubmitting ? "Signing in…" : session.status === "loading" ? "Checking your session…" : "Sign in"}</Button>
    <p className="text-center text-sm text-muted">Do you need an account? <Link href={authRouteWithReturnTo("/register", returnTo) as Route} className="font-semibold text-accent hover:underline">Create an account</Link></p>
  </form>;
}
