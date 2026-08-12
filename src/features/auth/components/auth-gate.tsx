"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";

export function AuthGate({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = useAuthSession();
  const router = useRouter();
  useEffect(() => { if (session.status === "unauthenticated" || session.status === "error") router.replace("/login" as Route); }, [router, session.status]);
  if (session.status === "loading") return <div role="status" aria-label="Checking session" className="rounded-2xl border border-border bg-surface p-8 text-sm text-muted">Checking your session…</div>;
  if (session.status !== "authenticated") return <div className="rounded-2xl border border-border bg-surface p-8"><p className="font-medium">Sign in required</p><p className="mt-2 text-sm text-muted">Redirecting to the secure sign-in page.</p><Link href={"/login" as Route}><Button variant="secondary" className="mt-4">Open sign in</Button></Link></div>;
  return children;
}
