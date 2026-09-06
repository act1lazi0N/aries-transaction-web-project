"use client";

import type { Route } from "next";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountCreationWorkspace } from "@/features/accounts/components/account-creation-workspace";
import { useAccounts } from "@/features/accounts/queries";
import type { Account } from "@/features/accounts/types";
import { requiresFirstFinancialAccount } from "@/features/auth/capabilities";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { SessionControls } from "@/features/auth/components/session-controls";
import { ApiError } from "@/lib/api/errors";

export function AccountRequiredGate({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = useAuthSession();
  const router = useRouter();
  const [isEnteringWorkspace, setIsEnteringWorkspace] = useState(false);
  const requiresOwnedAccount = requiresFirstFinancialAccount(session.user?.role);
  const accountsQuery = useAccounts(requiresOwnedAccount);

  if (!requiresOwnedAccount) return children;
  if (isEnteringWorkspace) return <FirstAccountFrame><div role="status" aria-label="Opening your account overview" className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-7 text-center shadow-sm"><RefreshCw aria-hidden="true" size={22} className="mx-auto animate-spin text-accent" /><h1 className="mt-4 text-xl font-semibold">Opening your account overview</h1><p className="mt-2 text-sm leading-6 text-muted">Your financial account is confirmed. Aries is opening the workspace with that account selected.</p></div></FirstAccountFrame>;
  if (accountsQuery.isPending) return <FirstAccountFrame><div role="status" aria-label="Checking your financial accounts" className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-7 shadow-sm"><div className="flex items-center gap-3"><RefreshCw aria-hidden="true" size={18} className="animate-spin text-accent" /><div><h1 className="font-semibold">Preparing your financial workspace</h1><p className="mt-1 text-sm leading-6 text-muted">Aries is checking whether you already have a financial account.</p></div></div><div className="mt-6 h-36 animate-pulse rounded-xl bg-surface-muted" /></div></FirstAccountFrame>;
  if (accountsQuery.isError && (!accountsQuery.data || accountsQuery.data.length === 0)) {
    const denied = accountsQuery.error instanceof ApiError && (accountsQuery.error.kind === "forbidden" || accountsQuery.error.kind === "unauthorized");
    return <FirstAccountFrame><section role="alert" className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-7"><div className="flex items-start gap-3"><AlertTriangle aria-hidden="true" size={20} className="mt-0.5 text-[var(--aries-danger)]" /><div><h1 className="font-semibold text-[var(--aries-danger)]">{denied ? "We cannot check your account access" : "We could not check your financial accounts"}</h1><p className="mt-2 text-sm leading-6 text-muted">Aries will not assume an unavailable account list is empty. Retry when the service is available.</p><Button type="button" variant="secondary" className="mt-5" onClick={() => void accountsQuery.refetch()}>Try again</Button></div></div></section></FirstAccountFrame>;
  }
  if ((accountsQuery.data?.length ?? 0) === 0) return <FirstAccountFrame><AccountCreationWorkspace mode="onboarding" onComplete={openOverview} /></FirstAccountFrame>;
  return children;

  function openOverview(account: Account) {
    setIsEnteringWorkspace(true);
    router.replace(`/overview?accountId=${encodeURIComponent(account.id)}` as Route);
  }
}

function FirstAccountFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-dvh bg-background"><header className="border-b border-border bg-surface"><div className="mx-auto flex min-h-16 max-w-[1280px] items-center justify-between gap-4 px-5 py-3 sm:px-6 lg:px-10"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-accent text-sm font-bold text-accent-foreground">A</div><div><p className="font-semibold tracking-tight">Aries</p><p className="text-xs text-muted">Financial account setup</p></div></div><SessionControls /></div></header><main className="mx-auto w-full max-w-[1280px] px-5 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12">{children}</main></div>;
}
