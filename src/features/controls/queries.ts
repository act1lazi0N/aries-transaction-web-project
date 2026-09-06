"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import type { AuthRequest } from "@/features/auth/request-types";
import { getReconciliationRun, getReconciliationRuns } from "@/features/controls/api";

export const reconciliationKeys = {
  all: ["reconciliation"] as const,
  detail: (runId: string) => [...reconciliationKeys.all, "detail", runId] as const,
  list: (page: number, size: number) => [...reconciliationKeys.all, "list", page, size] as const,
};

export function reconciliationRunOptions(runId: string, request?: AuthRequest) {
  return queryOptions({
    queryKey: reconciliationKeys.detail(runId),
    queryFn: () => getReconciliationRun(runId, request),
    enabled: Boolean(runId),
    retry: false,
    staleTime: 30_000,
  });
}

export function useReconciliationRuns(page = 0, size = 10) {
  const session = useAuthSession();
  return useQuery({ queryKey: reconciliationKeys.list(page, size), queryFn: () => getReconciliationRuns(page, size, session.request), enabled: session.status === "authenticated", retry: false, staleTime: 30_000 });
}

export function useReconciliationRun(runId?: string) {
  const session = useAuthSession();
  return useQuery({
    ...reconciliationRunOptions(runId ?? "", session.request),
    enabled: session.status === "authenticated" && Boolean(runId),
  });
}
