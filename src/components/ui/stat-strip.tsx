import { cn } from "@/lib/utils";

export function StatStrip({ items, className }: { items: { label: string; value: string; detail?: string; tone?: "neutral" | "success" | "warning" | "danger" }[]; className?: string }) {
  return <dl className={cn("grid overflow-hidden rounded-2xl border border-border bg-surface sm:grid-cols-2 xl:grid-cols-4", className)}>{items.map((item, index) => <div key={item.label} className={cn("p-5", index > 0 && "border-t border-border sm:border-l sm:border-t-0")}><dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{item.label}</dt><dd className={cn("mt-3 text-2xl font-semibold tabular-nums tracking-tight", { "text-[var(--aries-success)]": item.tone === "success", "text-[var(--aries-warning)]": item.tone === "warning", "text-[var(--aries-danger)]": item.tone === "danger" })}>{item.value}</dd>{item.detail && <p className="mt-1 text-xs text-muted">{item.detail}</p>}</div>)}</dl>;
}
