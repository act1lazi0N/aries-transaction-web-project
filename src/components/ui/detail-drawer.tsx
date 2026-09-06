"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export function DetailDrawer({ open, title, description, onClose, children }: { open: boolean; title: string; description?: string; onClose: () => void; children: React.ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const listener = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [onClose, open]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 bg-[var(--aries-overlay)]" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="drawer-title" aria-describedby={description ? "drawer-description" : undefined} className="ml-auto h-full w-full max-w-xl overflow-y-auto border-l border-border bg-surface p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 id="drawer-title" className="text-xl font-semibold">{title}</h2>{description && <p id="drawer-description" className="mt-2 text-sm leading-6 text-muted">{description}</p>}</div><Button ref={closeRef} variant="ghost" aria-label="Close details" onClick={onClose}><X aria-hidden="true" size={19} /></Button></div><div className="mt-6">{children}</div></section></div>;
}
