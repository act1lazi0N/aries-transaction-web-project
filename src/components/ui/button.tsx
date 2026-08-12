import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  return <button className={cn("inline-flex min-h-10 items-center justify-center rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50", {
    "bg-accent text-accent-foreground hover:brightness-95": variant === "primary",
    "border border-border bg-surface text-foreground hover:bg-surface-muted": variant === "secondary",
    "bg-[var(--aries-danger)] text-white hover:brightness-95": variant === "danger",
    "text-muted hover:bg-surface-muted hover:text-foreground": variant === "ghost",
  }, className)} {...props} />;
}
