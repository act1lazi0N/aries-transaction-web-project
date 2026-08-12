import { apiRequest } from "@/lib/api/client";
import type { PageResponse, Transaction } from "@/features/transactions/types";

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

export function getTransactionHistory(params: TransactionHistoryParams): Promise<PageResponse<Transaction>> {
  return apiRequest<PageResponse<Transaction>>(transactionHistoryPath(params), { accessToken: params.accessToken });
}
