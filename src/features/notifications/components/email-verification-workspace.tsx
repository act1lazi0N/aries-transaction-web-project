"use client";

import { AlertTriangle, CircleCheck, LoaderCircle, MailCheck } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { confirmEmailVerification } from "@/features/notifications/api";
import type { EmailVerificationStatus } from "@/features/notifications/types";
import { ApiError } from "@/lib/api/errors";

export function EmailVerificationWorkspace({ token }: { token?: string }) {
  const session = useAuthSession();
  const [result, setResult] = useState<"verifying" | "verified" | "invalid" | "unavailable">("verifying");
  const attempt = useRef<{ token: string; promise: Promise<EmailVerificationStatus> } | null>(null);

  useEffect(() => {
    if (!token) return;
    window.history.replaceState(window.history.state, "", "/verify-email");
    if (attempt.current?.token !== token) {
      setResult("verifying");
      attempt.current = { token, promise: confirmEmailVerification(token) };
    }
    let active = true;
    void attempt.current.promise.then(value => {
      if (active) setResult(value.emailVerified ? "verified" : "unavailable");
    }).catch((cause: unknown) => {
      if (!active) return;
      const error = cause instanceof ApiError ? cause : new ApiError("Email verification failed", { kind: "unknown" });
      setResult(error.kind === "validation" ? "invalid" : "unavailable");
    });
    return () => { active = false; };
  }, [token]);

  const destination = session.status === "authenticated" ? "/settings" : "/login";
  const destinationLabel = session.status === "authenticated" ? "Review notification settings" : "Continue to sign in";
  let state: "missing" | "verifying" | "verified" | "invalid" | "unavailable" = "verifying";
  if (!token) state = "missing";
  else state = result;

  const content = {
    missing: { icon: AlertTriangle, tone: "text-[var(--aries-warning)]", eyebrow: "Link incomplete", title: "Verification token is missing", detail: "Open the complete link from your verification email. Aries did not make a verification request from this page." },
    verifying: { icon: LoaderCircle, tone: "animate-spin text-accent", eyebrow: "Email verification", title: "Verifying your email…", detail: "Aries is checking this one-time link. Keep this page open until the service confirms the result." },
    verified: { icon: CircleCheck, tone: "text-[var(--aries-success)]", eyebrow: "Email verified", title: "Your email is verified", detail: "The service confirmed your address. Eligible notification email can now be delivered according to your preferences." },
    invalid: { icon: AlertTriangle, tone: "text-[var(--aries-danger)]", eyebrow: "Link unavailable", title: "This link is invalid or expired", detail: "Verification links are one-time and time-limited. Sign in and request a fresh link from Settings." },
    unavailable: { icon: AlertTriangle, tone: "text-[var(--aries-warning)]", eyebrow: "Status unavailable", title: "Verification could not be confirmed", detail: "The service did not confirm success or failure. Do not reuse this link repeatedly; return later or request a fresh link from Settings." },
  }[state];
  const Icon = content.icon;

  return <main className="grid min-h-dvh place-items-center bg-background px-5 py-10"><section aria-labelledby="verification-title" className="w-full max-w-lg rounded-3xl border border-border bg-surface p-7 shadow-sm sm:p-9"><div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--aries-accent)_14%,white)]"><MailCheck aria-hidden="true" className="text-accent-foreground" size={20} /></div><div><p className="font-semibold">Aries</p><p className="text-xs text-muted">Secure email confirmation</p></div></div><div className="mt-10"><Icon aria-hidden="true" className={content.tone} size={28} /><p className="mt-5 text-sm font-semibold text-accent">{content.eyebrow}</p><h1 id="verification-title" className="mt-2 text-2xl font-semibold tracking-tight">{content.title}</h1><p className="mt-3 leading-7 text-muted">{content.detail}</p></div>{state !== "verifying" && <Link href={destination as Route} className="mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:brightness-95">{destinationLabel}</Link>}<p className="mt-6 text-center text-xs leading-5 text-muted">Aries never asks you to paste a verification token into another page.</p></section></main>;
}
