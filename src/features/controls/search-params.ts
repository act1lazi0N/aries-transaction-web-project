export type ControlSearchParams = { runId?: string };

export function parseControlSearchParams(searchParams: URLSearchParams | Record<string, string | string[] | undefined>): ControlSearchParams {
  const value = searchParams instanceof URLSearchParams
    ? searchParams.get("runId")
    : Array.isArray(searchParams.runId) ? searchParams.runId[0] : searchParams.runId;
  const runId = value?.trim();
  return runId && runId.length <= 100 ? { runId } : {};
}
