import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn("h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-sm outline-none disabled:cursor-not-allowed disabled:opacity-55", className)} {...props} />;
});
