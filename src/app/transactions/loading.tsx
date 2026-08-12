import { AppShell } from "@/components/app-shell";

export default function Loading() {
  return <AppShell><div role="status" aria-label="Loading transactions" className="space-y-4"><div className="h-4 w-28 animate-pulse rounded bg-surface-muted" /><div className="h-10 w-72 animate-pulse rounded bg-surface-muted" /><div className="h-32 rounded-2xl border border-border bg-surface" /></div></AppShell>;
}
