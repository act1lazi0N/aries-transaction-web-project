import { SessionControls } from "@/features/auth/components/session-controls";
import { NavigationLinks } from "@/components/navigation-links";

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
    <aside className="border-b border-border bg-surface px-5 py-5 lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="mb-8 flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-accent text-sm font-bold text-accent-foreground">A</div><div><p className="font-semibold tracking-tight">ATC project</p><p className="text-xs text-muted">Financial workspace</p></div></div>
      <NavigationLinks />
    </aside>
    <div className="min-w-0"><header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6 lg:px-10"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Workspace</p><p className="text-sm font-medium">Financial operations</p></div><div className="flex items-center gap-4"><span className="hidden text-xs text-muted md:inline">Notifications not available yet</span><SessionControls /></div></header><main className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10">{children}</main></div>
  </div>;
}
