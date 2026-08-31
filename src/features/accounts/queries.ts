"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { getAccounts } from "@/features/accounts/api";

export const accountKeys = {
  all: ["accounts"] as const,
  mine: (userId: string) => [...accountKeys.all, "mine", userId] as const,
};

export function accountOptions(userId: string, request?: ReturnType<typeof useAuthSession>["request"]) {
  return queryOptions({
    queryKey: accountKeys.mine(userId),
    queryFn: () => getAccounts(request),
    retry: false,
    staleTime: 30_000,
  });
}

export function useAccounts(enabled = true) {
  const session = useAuthSession();
  const userId = session.user?.id ?? "anonymous";
  return useQuery({
    ...accountOptions(userId, session.request),
    enabled: enabled && session.status === "authenticated" && Boolean(session.user?.id),
  });
}
