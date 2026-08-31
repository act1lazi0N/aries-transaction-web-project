"use client";

import type { Route } from "next";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AccountRequiredGate } from "@/features/accounts/components/account-required-gate";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { defaultRouteForRole, hasCapability, type WorkspaceCapability } from "@/features/auth/capabilities";

export function ProtectedWorkspace({ capability, children }: Readonly<{ capability: WorkspaceCapability; children: React.ReactNode }>) {
  return <AuthGate><CapabilityBoundary capability={capability}>{children}</CapabilityBoundary></AuthGate>;
}

function CapabilityBoundary({ capability, children }: Readonly<{ capability: WorkspaceCapability; children: React.ReactNode }>) {
  const session = useAuthSession();
  const router = useRouter();
  const allowed = hasCapability(session.user?.role, capability);
  const destination = defaultRouteForRole(session.user?.role);

  useEffect(() => {
    if (!allowed) router.replace(destination as Route);
  }, [allowed, destination, router]);

  if (!allowed) return <main className="grid min-h-dvh place-items-center bg-background px-6 py-10"><div role="status" className="flex items-center gap-3 text-sm text-muted"><span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-accent" />Opening your workspace…</div></main>;
  return <AccountRequiredGate>{children}</AccountRequiredGate>;
}
