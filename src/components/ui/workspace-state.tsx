import { AlertTriangle, CircleCheck, Clock3, Info, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) {
  return <section role="status" className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center"><SearchX aria-hidden="true" className="mx-auto text-muted" size={24} /><h2 className="mt-3 font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">{detail}</p>{action && <div className="mt-5">{action}</div>}</section>;
}

export function ErrorState({ title, detail, onRetry }: { title: string; detail: string; onRetry?: () => void }) {
  return <section role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6"><div className="flex gap-3"><AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--aries-danger)]" size={19} /><div><h2 className="font-semibold text-[var(--aries-danger)]">{title}</h2><p className="mt-1 text-sm leading-6 text-muted">{detail}</p>{onRetry && <Button variant="secondary" className="mt-4" onClick={onRetry}>Try again</Button>}</div></div></section>;
}

const bannerIcons = { info: Info, success: CircleCheck, warning: Clock3, danger: AlertTriangle } as const;
export function StatusBanner({ tone = "info", title, children }: { tone?: keyof typeof bannerIcons; title: string; children: React.ReactNode }) {
  const Icon = bannerIcons[tone];
  return <section role={tone === "danger" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3", {
    "border-sky-200 bg-sky-50": tone === "info",
    "border-green-200 bg-green-50": tone === "success",
    "border-amber-200 bg-amber-50": tone === "warning",
    "border-red-200 bg-red-50": tone === "danger",
  })}><div className="flex gap-3"><Icon aria-hidden="true" size={18} className="mt-0.5 shrink-0" /><div><p className="text-sm font-semibold">{title}</p><div className="mt-1 text-sm leading-6 text-muted">{children}</div></div></div></section>;
}

export function WorkspaceSkeleton({ label = "Loading workspace" }: { label?: string }) {
  return <div role="status" aria-label={label} className="space-y-4"><div className="h-8 w-56 animate-pulse rounded-lg bg-surface-muted" /><div className="grid gap-4 md:grid-cols-3"><div className="h-32 animate-pulse rounded-2xl bg-surface-muted" /><div className="h-32 animate-pulse rounded-2xl bg-surface-muted" /><div className="h-32 animate-pulse rounded-2xl bg-surface-muted" /></div><div className="h-72 animate-pulse rounded-2xl bg-surface-muted" /></div>;
}
