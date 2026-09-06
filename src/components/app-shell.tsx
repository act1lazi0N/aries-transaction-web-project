"use client";

import { useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { SessionControls } from "@/features/auth/components/session-controls";
import { NavigationLinks } from "@/components/navigation-links";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const current = pathname.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ") ?? "workspace";
  return <div className={`min-h-dvh lg:grid ${collapsed ? "lg:grid-cols-[84px_1fr]" : "lg:grid-cols-[248px_1fr]"}`}>
    <aside className="sticky top-0 hidden h-dvh border-r border-border bg-[var(--aries-shell)] px-4 py-5 lg:flex lg:flex-col">
      <Brand collapsed={collapsed} />
      <div className="mt-7 min-h-0 flex-1 overflow-y-auto"><NavigationLinks collapsed={collapsed} /></div>
      <Button variant="ghost" className="mt-4 w-full" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(value => !value)}>{collapsed ? <PanelLeftOpen aria-hidden="true" size={18} /> : <><PanelLeftClose aria-hidden="true" size={18} /><span className="ml-2">Collapse</span></>}</Button>
    </aside>
    {mobileOpen && <div className="fixed inset-0 z-50 bg-slate-950/35 lg:hidden" role="presentation" onClick={() => setMobileOpen(false)}><aside role="dialog" aria-modal="true" aria-label="Navigation" className="h-full w-[min(86vw,320px)] bg-[var(--aries-shell)] p-5 shadow-2xl" onClick={event => event.stopPropagation()}><div className="flex items-center justify-between"><Brand /><Button variant="ghost" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X aria-hidden="true" size={20} /></Button></div><div className="mt-7"><NavigationLinks onNavigate={() => setMobileOpen(false)} /></div></aside></div>}
    <div className="min-w-0">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-10"><div className="flex min-w-0 items-center gap-3"><Button variant="ghost" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu aria-hidden="true" size={20} /></Button><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Aries / Workspace</p><p className="truncate text-sm font-semibold capitalize">{current}</p></div></div><SessionControls /></header>
      <div id="global-feedback" aria-live="polite" aria-atomic="true" className="sr-only" />
      <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-9">{children}</main>
    </div>
  </div>;
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-sm font-black text-accent-foreground shadow-[0_5px_18px_color-mix(in_srgb,var(--aries-accent)_24%,transparent)]">A</div><div className={collapsed ? "sr-only" : undefined}><p className="font-semibold tracking-tight">Aries</p><p className="text-xs text-muted">Financial workspace</p></div></div>;
}
