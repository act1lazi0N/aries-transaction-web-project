"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { getSettlementBatch, getSettlementBatches } from "@/features/settlements/api";
import type { AuthRequest } from "@/features/auth/request-types";

export const settlementKeys = {
  all: ["settlements"] as const,
  detail: (batchId: string) => [...settlementKeys.all, "detail", batchId] as const,
  list: (page: number, size: number) => [...settlementKeys.all, "list", page, size] as const,
};

export function settlementBatchOptions(batchId: string, request?: AuthRequest) {
  return queryOptions({
    queryKey: settlementKeys.detail(batchId),
    queryFn: () => getSettlementBatch(batchId, request),
    enabled: Boolean(batchId),
    retry: false,
    staleTime: 30_000,
  });
}

export function useSettlementBatches(page = 0, size = 10) {
  const session = useAuthSession();
  return useQuery({ queryKey: settlementKeys.list(page, size), queryFn: () => getSettlementBatches(page, size, session.request), enabled: session.status === "authenticated", retry: false, staleTime: 30_000 });
}

export function useSettlementBatch(batchId?: string) {
  const session = useAuthSession();
  return useQuery({
    ...settlementBatchOptions(batchId ?? "", session.request),
    enabled: session.status === "authenticated" && Boolean(batchId),
  });
}
