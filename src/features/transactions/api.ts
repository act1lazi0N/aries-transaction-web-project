import { apiRequest } from "@/lib/api/client";
import type { PageResponse, Transaction } from "@/features/transactions/types";
import type { AuthRequest } from "@/features/auth/request-types";

export type TransactionHistoryParams = {
  accountId: string;
  page?: number;
  size?: number;
  sort?: string;
  accessToken?: string;
};

export function transactionHistoryPath({ accountId, page = 0, size = 20, sort = "createdAt,desc" }: TransactionHistoryParams): string {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort });
  return `/api/v1/transfers/account/${encodeURIComponent(accountId)}?${params.toString()}`;
}

export function getTransactionHistory(params: TransactionHistoryParams, request?: AuthRequest): Promise<PageResponse<Transaction>> {
  const path = transactionHistoryPath(params);
  return request ? request<PageResponse<Transaction>>(path) : apiRequest<PageResponse<Transaction>>(path, { accessToken: params.accessToken });
}
