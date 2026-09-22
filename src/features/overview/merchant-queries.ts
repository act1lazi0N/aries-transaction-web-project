import { useQuery } from "@tanstack/react-query";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { getMerchantOverview } from "@/features/overview/merchant-api";

export function useMerchantOverview(range: string, timezone: string) {
  const session = useAuthSession();
  return useQuery({ queryKey: ["merchant-overview", session.user?.id, range, timezone], queryFn: () => getMerchantOverview(range, timezone, session.request), enabled: session.status === "authenticated" && session.user?.role === "MERCHANT", retry: false, staleTime: 30_000 });
}
