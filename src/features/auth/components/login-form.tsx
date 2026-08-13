"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { userFacingErrorMessage } from "@/lib/api/errors";

export function LoginForm() {
  const router = useRouter();
  const session = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => { if (session.status === "authenticated") router.replace("/"); }, [router, session.status]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFormError(null);
    if (!email.trim() || !password) { setFormError("Enter your email and password."); return; }
    try { await session.signIn({ email: email.trim(), password }); }
    catch (error) { setFormError(userFacingErrorMessage(error, "Sign in failed. Try again.")); }
  }

  return <form onSubmit={submit} noValidate className="space-y-5" aria-describedby={formError ? "login-error" : undefined}>
    <div><label htmlFor="email" className="mb-2 block text-sm font-medium">Email</label><input id="email" name="email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent" /></div>
    <div><label htmlFor="password" className="mb-2 block text-sm font-medium">Password</label><input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent" /></div>
    {formError && <p id="login-error" role="alert" className="text-sm text-[var(--aries-danger)]">{formError}</p>}
    <Button type="submit" className="w-full" disabled={session.status === "loading"}>{session.status === "loading" ? "Signing in…" : "Sign in"}</Button>
    <p className="text-center text-sm text-muted">New to Aries? <Link href="/register" className="font-semibold text-accent hover:underline">Create an account</Link></p>
  </form>;
}
