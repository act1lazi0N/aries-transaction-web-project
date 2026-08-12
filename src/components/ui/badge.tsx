import { cn } from "@/lib/utils";

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "pending" }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", {
    "bg-surface-muted text-muted": tone === "neutral",
    "bg-green-50 text-[var(--aries-success)]": tone === "success",
    "bg-amber-50 text-[var(--aries-warning)]": tone === "warning",
    "bg-red-50 text-[var(--aries-danger)]": tone === "danger",
    "bg-violet-50 text-[var(--aries-pending)]": tone === "pending",
  })}>{children}</span>;
}
