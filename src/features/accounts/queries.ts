"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { getAccounts } from "@/features/accounts/api";

export const accountKeys = {
  all: ["accounts"] as const,
  mine: () => [...accountKeys.all, "mine"] as const,
};

export function accountOptions(request?: ReturnType<typeof useAuthSession>["request"]) {
  return queryOptions({
    queryKey: accountKeys.mine(),
    queryFn: () => getAccounts(request),
    retry: false,
    staleTime: 30_000,
  });
}

export function useAccounts() {
  const session = useAuthSession();
  return useQuery({
    ...accountOptions(session.request),
    enabled: session.status === "authenticated",
  });
}
