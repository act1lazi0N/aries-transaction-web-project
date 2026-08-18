"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";

export function SessionControls() {
  const router = useRouter();
  const session = useAuthSession();
  if (session.status !== "authenticated" || !session.user) return null;
  async function handleSignOut() {
    try { await session.signOut(); } finally { router.replace("/login" as Route); }
  }
  return <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-medium">{session.user.fullName}</p><p className="text-xs text-muted">{session.user.role}</p></div><Button type="button" variant="ghost" aria-label="Sign out" onClick={() => void handleSignOut()}><LogOut aria-hidden="true" size={17} /><span className="sr-only sm:not-sr-only sm:ml-2">Sign out</span></Button></div>;
}
