"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

export function MarketingMobileMenu() {
  const [open, setOpen] = useState(false);
  return <div className="md:hidden"><button type="button" aria-expanded={open} aria-controls="marketing-mobile-navigation" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen(value => !value)} className="grid size-10 place-items-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground">{open ? <X aria-hidden="true" size={19} /> : <Menu aria-hidden="true" size={19} />}</button>{open && <nav id="marketing-mobile-navigation" aria-label="Mobile marketing navigation" className="absolute inset-x-0 top-16 border-b border-border bg-background px-6 py-4 shadow-sm"><div className="mx-auto flex max-w-7xl flex-col gap-1"><a href="#platform" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-sm text-muted hover:bg-surface-muted hover:text-foreground">Platform</a><a href="#safety" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-sm text-muted hover:bg-surface-muted hover:text-foreground">Safety</a><a href="#access" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-sm text-muted hover:bg-surface-muted hover:text-foreground">Access</a></div></nav>}</div>;
}
