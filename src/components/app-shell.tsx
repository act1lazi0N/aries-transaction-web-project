import Link from "next/link";
import type { Route } from "next";
import { Activity, ArrowLeftRight, Bell, LayoutDashboard, Settings, ShieldCheck } from "lucide-react";

const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/controls", label: "Controls", icon: ShieldCheck },
] as const;

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
    <aside className="border-b border-border bg-surface px-5 py-5 lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="mb-8 flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-accent text-sm font-bold text-accent-foreground">A</div><div><p className="font-semibold tracking-tight">Aries</p><p className="text-xs text-muted">Operations workspace</p></div></div>
      <nav aria-label="Primary navigation" className="space-y-1">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href as Route} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground ${href === "/" ? "bg-surface-muted font-medium text-foreground" : ""}`}><Icon aria-hidden="true" size={18} />{label}</Link>)}</nav>
      <div className="mt-8 border-t border-border pt-4"><Link href={"/settings" as Route} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-surface-muted hover:text-foreground"><Settings aria-hidden="true" size={18} />Settings</Link></div>
    </aside>
    <div className="min-w-0"><header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6 lg:px-10"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Workspace</p><p className="text-sm font-medium">Financial operations</p></div><button type="button" aria-label="View notifications" className="rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-foreground"><Bell aria-hidden="true" size={19} /></button></header><main className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10">{children}</main></div>
  </div>;
}
