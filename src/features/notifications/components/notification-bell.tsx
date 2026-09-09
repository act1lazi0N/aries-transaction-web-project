"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useUnreadNotificationCount } from "@/features/notifications/queries";

export function NotificationBell() {
  const query = useUnreadNotificationCount();
  const count = query.data ?? 0;
  const label = count > 0 ? `Notifications, ${count} unread` : "Notifications";

  return <Link href={"/notifications" as Route} aria-label={label} title={label} className="relative inline-flex size-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground">
    <Bell aria-hidden="true" size={18} />
    {count > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[var(--aries-danger)] px-1.5 py-0.5 text-center text-[10px] font-bold leading-4 text-white shadow-sm">{count > 99 ? "99+" : count}</span>}
  </Link>;
}
