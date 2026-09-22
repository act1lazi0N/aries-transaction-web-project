import { queryOptions, useQuery } from "@tanstack/react-query";
import { getTransaction, getTransactionHistory, type TransactionHistoryParams } from "@/features/transactions/api";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";

export const transactionKeys = {
  all: ["transactions"] as const,
  user: (userId: string) => [...transactionKeys.all, "user", userId] as const,
  history: (userId: string, params: Omit<TransactionHistoryParams, "accessToken">) => [...transactionKeys.user(userId), "history", params] as const,
  detail: (userId: string, transactionId: string) => [...transactionKeys.user(userId), "detail", transactionId] as const,
};

export function transactionHistoryOptions(userId: string, params: TransactionHistoryParams) {
  return queryOptions({
    queryKey: transactionKeys.history(userId, { accountId: params.accountId, page: params.page, size: params.size, sort: params.sort }),
    queryFn: () => getTransactionHistory(params),
    retry: false,
    staleTime: 30_000,
  });
}

export function useTransactionHistory(params: TransactionHistoryParams) {
  const session = useAuthSession();
  const userId = session.user?.id ?? "anonymous";
  return useQuery({ ...transactionHistoryOptions(userId, params), queryFn: () => getTransactionHistory(params, session.request), enabled: session.status === "authenticated" && Boolean(session.user?.id) && Boolean(params.accountId) });
}

export function useTransactionDetail(transactionId?: string) {
  const session = useAuthSession();
  const userId = session.user?.id ?? "anonymous";
  return useQuery({
    queryKey: transactionKeys.detail(userId, transactionId ?? ""),
    queryFn: () => getTransaction(transactionId ?? "", session.request),
    enabled: session.status === "authenticated" && Boolean(session.user?.id) && Boolean(transactionId),
    retry: false,
    staleTime: 30_000,
  });
}
