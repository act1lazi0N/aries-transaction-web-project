"use client";

import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { MerchantOverviewWorkspace } from "@/features/overview/components/merchant-overview-workspace";
import { OverviewWorkspace } from "@/features/overview/components/overview-workspace";

export function PersonaOverviewWorkspace({ initialAccountId, range }: { initialAccountId?: string; range?: string }) {
  const session = useAuthSession();
  return session.user?.role === "MERCHANT" ? <MerchantOverviewWorkspace initialRange={range} /> : <OverviewWorkspace initialAccountId={initialAccountId} />;
}
