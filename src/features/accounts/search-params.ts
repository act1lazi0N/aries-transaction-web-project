export type AccountSearchParams = { accountId?: string };

export function parseAccountSearchParams(searchParams: URLSearchParams | Record<string, string | string[] | undefined>): AccountSearchParams {
  const value = searchParams instanceof URLSearchParams
    ? searchParams.get("accountId")
    : Array.isArray(searchParams.accountId) ? searchParams.accountId[0] : searchParams.accountId;
  return { accountId: value && value.trim() ? value.trim() : undefined };
}
