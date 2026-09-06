"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowLeftRight, Building2, Landmark, LayoutDashboard, ListTree, Send, Settings, ShieldCheck, UsersRound, WalletCards } from "lucide-react";
import { usePathname } from "next/navigation";
import { hasCapability, workspaceRoutes } from "@/features/auth/capabilities";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";

const navigation = [
  { ...workspaceRoutes.overview, label: "Overview", icon: LayoutDashboard },
  { ...workspaceRoutes.operations, label: "Operations", icon: Building2 },
  { ...workspaceRoutes.customers, label: "Customers", icon: UsersRound },
  { ...workspaceRoutes.transfers, label: "Transfers", icon: Send },
  { ...workspaceRoutes.transactions, label: "Transactions", icon: ArrowLeftRight },
  { ...workspaceRoutes.newAccount, label: "Accounts", icon: WalletCards },
  { ...workspaceRoutes.ledger, label: "Ledger", icon: ListTree },
  { ...workspaceRoutes.controls, label: "Controls", icon: ShieldCheck },
  { ...workspaceRoutes.settlements, label: "Settlements", icon: Landmark },
  { ...workspaceRoutes.settings, label: "Settings", icon: Settings },
] as const;

export function NavigationLinks({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const session = useAuthSession();
  const availableNavigation = navigation.filter(({ capability }) => hasCapability(session.user?.role, capability));
  return <nav aria-label="Primary navigation" className="space-y-1">
    {availableNavigation.map(({ href, label, icon: Icon }) => {
      const active = pathname === href || pathname.startsWith(`${href}/`);
      const visibleLabel = label === "Overview" && session.user?.role === "MERCHANT" ? "Merchant Overview" : label;
      return <Link key={href} href={href as Route} onClick={onNavigate} title={collapsed ? visibleLabel : undefined} aria-current={active ? "page" : undefined} className={`group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground ${collapsed ? "justify-center" : ""} ${active ? "bg-[color-mix(in_srgb,var(--aries-accent)_12%,white)] font-semibold text-foreground before:h-5 before:w-0.5 before:rounded-full before:bg-accent" : ""}`}><Icon aria-hidden="true" size={18} className="shrink-0" /><span className={collapsed ? "sr-only" : undefined}>{visibleLabel}</span></Link>;
    })}
  </nav>;
}
