import { AppShell } from "@/components/app-shell";

export default function Loading() {
  return <AppShell><div role="status" aria-label="Loading account overview" className="space-y-4"><div className="h-4 w-40 animate-pulse rounded bg-surface-muted" /><div className="h-10 w-80 animate-pulse rounded bg-surface-muted" /><div className="grid gap-4 md:grid-cols-3"><div className="h-32 animate-pulse rounded-2xl bg-surface-muted" /><div className="h-32 animate-pulse rounded-2xl bg-surface-muted" /><div className="h-32 animate-pulse rounded-2xl bg-surface-muted" /></div></div></AppShell>;
}
