"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { loginRouteFor } from "@/features/auth/routes";

export function AuthGate({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = useAuthSession();
  const router = useRouter();
  useEffect(() => {
    if (session.status !== "unauthenticated" && session.status !== "error") return;
    const currentRoute = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    router.replace(loginRouteFor(currentRoute) as Route);
  }, [router, session.status]);
  if (session.status === "loading") return <AuthAccessScreen><div role="status" aria-label="Checking your session"><p className="font-medium">Checking your session…</p><p className="mt-2 text-sm leading-6 text-muted">Aries is confirming your access before opening the workspace.</p></div></AuthAccessScreen>;
  if (session.status !== "authenticated") return <AuthAccessScreen><div><h1 className="text-xl font-semibold">Please sign in to continue</h1><p className="mt-2 text-sm leading-6 text-muted">We’ll take you to sign in, then bring you back to an available workspace page.</p><Link href={"/login" as Route}><Button variant="secondary" className="mt-5">Go to sign in</Button></Link></div></AuthAccessScreen>;
  return children;
}

function AuthAccessScreen({ children }: Readonly<{ children: React.ReactNode }>) {
  return <main className="grid min-h-dvh place-items-center bg-background px-6 py-10"><section className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 shadow-sm"><div className="mb-6 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-accent text-sm font-bold text-accent-foreground">A</div><div><p className="font-semibold tracking-tight">ATC project</p><p className="text-xs text-muted">Secure workspace access</p></div></div>{children}</section></main>;
}
