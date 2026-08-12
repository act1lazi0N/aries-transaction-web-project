import { queryOptions, useQuery } from "@tanstack/react-query";
import { getTransactionHistory, type TransactionHistoryParams } from "@/features/transactions/api";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";

export const transactionKeys = {
  all: ["transactions"] as const,
  history: (params: Omit<TransactionHistoryParams, "accessToken">) => [...transactionKeys.all, "history", params] as const,
};

export function transactionHistoryOptions(params: TransactionHistoryParams) {
  return queryOptions({
    queryKey: transactionKeys.history({ accountId: params.accountId, page: params.page, size: params.size, sort: params.sort }),
    queryFn: () => getTransactionHistory(params),
    retry: false,
    staleTime: 30_000,
  });
}

export function useTransactionHistory(params: TransactionHistoryParams) {
  const session = useAuthSession();
  return useQuery({ ...transactionHistoryOptions(params), queryFn: () => getTransactionHistory(params, session.request), enabled: session.status === "authenticated" && Boolean(params.accountId) });
}
