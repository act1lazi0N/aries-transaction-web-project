import type { TransactionHistoryParams } from "@/features/transactions/api";

export type TransactionSearchParams = Pick<TransactionHistoryParams, "page" | "size" | "sort"> & { accountId?: string; transactionId?: string; status?: string; currency?: string; from?: string; to?: string };

export function parseTransactionSearchParams(searchParams: URLSearchParams | Record<string, string | string[] | undefined>): TransactionSearchParams {
  const get = (key: string) => searchParams instanceof URLSearchParams ? searchParams.get(key) : searchParams[key] instanceof Array ? searchParams[key][0] : searchParams[key];
  const page = Number.parseInt(get("page") ?? "0", 10);
  const size = Number.parseInt(get("size") ?? "20", 10);
  return {
    accountId: get("accountId") || undefined,
    transactionId: get("transactionId") || undefined,
    status: get("status") || undefined,
    currency: get("currency") || undefined,
    from: get("from") || undefined,
    to: get("to") || undefined,
    page: Number.isInteger(page) && page >= 0 ? page : 0,
    size: Number.isInteger(size) && size > 0 && size <= 100 ? size : 20,
    sort: get("sort") || "createdAt,desc",
  };
}
