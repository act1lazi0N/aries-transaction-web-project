import type { TransferRouteMode } from "@/features/transfers/types";

export type TransferSearchParams = {
  mode: TransferRouteMode;
  view?: "send" | "pay-qr" | "receive";
  page?: number;
  qrId?: string;
  accountId?: string;
  transactionId?: string;
};

type SearchParamsInput = URLSearchParams | Record<string, string | string[] | undefined>;

export function parseTransferSearchParams(searchParams: SearchParamsInput): TransferSearchParams {
  const mode = firstValue(searchParams, "mode") === "own-accounts" ? "own-accounts" : "external";
  const accountId = nonBlank(firstValue(searchParams, "accountId"));
  const transactionId = nonBlank(firstValue(searchParams, "transactionId"));
  const view = firstValue(searchParams, "view");
  const page = Number(firstValue(searchParams, "page") ?? "0");
  return { mode, accountId, transactionId, ...(view === "receive" || view === "pay-qr" ? { view, page: Number.isSafeInteger(page) && page >= 0 ? page : 0, ...(nonBlank(firstValue(searchParams, "qrId")) ? { qrId: nonBlank(firstValue(searchParams, "qrId")) } : {}) } : {}) };
}
export function transferRoutePath(params: TransferSearchParams): string {
  const search = new URLSearchParams({ mode: params.mode });
  if (params.view) search.set("view", params.view);
  if (params.page) search.set("page", String(params.page));
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
