"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  onCheckedChange?: (checked: boolean) => void;
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch({ className, checked, disabled, onCheckedChange, ...props }, ref) {
  return <span className={cn("relative inline-flex h-7 w-12 shrink-0", className)}>
    <input ref={ref} type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={event => onCheckedChange?.(event.target.checked)} className="peer absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed" {...props} />
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full border border-border bg-surface-muted transition-colors peer-checked:border-accent peer-checked:bg-accent peer-disabled:opacity-50 peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color-mix(in_srgb,var(--aries-accent)_70%,white)]" />
    <span aria-hidden="true" className="pointer-events-none absolute left-1 top-1 size-5 rounded-full bg-surface shadow-sm transition-transform peer-checked:translate-x-5" />
  </span>;
});
