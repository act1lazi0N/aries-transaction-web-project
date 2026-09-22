"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { visibilityLabel: string }>(function PasswordInput({ visibilityLabel, className, disabled, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return <div className="relative">
    <Input {...props} ref={ref} type={visible ? "text" : "password"} disabled={disabled} className={cn("h-11 pr-12", className)} />
    <button type="button" disabled={disabled} aria-label={`${visible ? "Hide" : "Show"} ${visibilityLabel}`} aria-pressed={visible} aria-controls={props.id} onClick={() => setVisible(value => !value)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted hover:text-foreground disabled:opacity-50"><Icon size={18} aria-hidden="true" /></button>
  </div>;
});
