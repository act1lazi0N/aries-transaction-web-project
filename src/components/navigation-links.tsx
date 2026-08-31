"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowLeftRight, Landmark, LayoutDashboard, Send, Settings, ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { hasCapability, workspaceRoutes } from "@/features/auth/capabilities";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";

const navigation = [
  { ...workspaceRoutes.overview, label: "Overview", icon: LayoutDashboard },
  { ...workspaceRoutes.transactions, label: "Transactions", icon: ArrowLeftRight },
  { ...workspaceRoutes.transfers, label: "New transfer", icon: Send },
  { ...workspaceRoutes.controls, label: "Controls", icon: ShieldCheck },
  { ...workspaceRoutes.settlements, label: "Settlements", icon: Landmark },
  { ...workspaceRoutes.settings, label: "Settings", icon: Settings },
] as const;

export function NavigationLinks() {
  const pathname = usePathname();
  const session = useAuthSession();
  const availableNavigation = navigation.filter(({ capability }) => hasCapability(session.user?.role, capability));
  return <nav aria-label="Primary navigation" className="space-y-1">
    {availableNavigation.map(({ href, label, icon: Icon }) => {
      const active = pathname === href || pathname.startsWith(`${href}/`);
      return <Link key={href} href={href as Route} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground ${active ? "bg-surface-muted font-medium text-foreground" : ""}`}><Icon aria-hidden="true" size={18} />{label}</Link>;
    })}
  </nav>;
}
