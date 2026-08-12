"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowLeftRight, LayoutDashboard, Settings, ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/controls", label: "Controls", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function NavigationLinks() {
  const pathname = usePathname();
  return <nav aria-label="Primary navigation" className="space-y-1">
    {navigation.map(({ href, label, icon: Icon }) => {
      const active = pathname === href || pathname.startsWith(`${href}/`);
      return <Link key={href} href={href as Route} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground ${active ? "bg-surface-muted font-medium text-foreground" : ""}`}><Icon aria-hidden="true" size={18} />{label}</Link>;
    })}
  </nav>;
}
