import type { TransferRouteMode } from "@/features/transfers/types";

export type TransferSearchParams = {
  mode: TransferRouteMode;
  accountId?: string;
  transactionId?: string;
};

type SearchParamsInput = URLSearchParams | Record<string, string | string[] | undefined>;

export function parseTransferSearchParams(searchParams: SearchParamsInput): TransferSearchParams {
  const mode = firstValue(searchParams, "mode") === "own-accounts" ? "own-accounts" : "external";
  const accountId = nonBlank(firstValue(searchParams, "accountId"));
  const transactionId = nonBlank(firstValue(searchParams, "transactionId"));
  return { mode, accountId, transactionId };
}
export function transferRoutePath(params: TransferSearchParams): string {
  const search = new URLSearchParams({ mode: params.mode });
  if (params.accountId) search.set("accountId", params.accountId);
  if (params.transactionId) search.set("transactionId", params.transactionId);
  return `/transfers?${search.toString()}`;
}

function firstValue(searchParams: SearchParamsInput, key: string): string | undefined {
  if (searchParams instanceof URLSearchParams) return searchParams.get(key) ?? undefined;
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function nonBlank(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
