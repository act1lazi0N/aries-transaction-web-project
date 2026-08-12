export type ApiErrorKind =
  | "unauthorized"
  | "forbidden"
  | "conflict"
  | "rate_limited"
  | "server"
  | "validation"
  | "network"
  | "unknown";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly requestId: string | null;

  constructor(message: string, options: { kind: ApiErrorKind; status?: number | null; requestId?: string | null }) {
    super(message);
    this.name = "ApiError";
    this.kind = options.kind;
    this.status = options.status ?? null;
    this.requestId = options.requestId ?? null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function messageFromPayload(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  return typeof payload.message === "string" ? payload.message : null;
}

function errorKind(status: number): ApiErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limited";
  if (status === 400 || status === 422) return "validation";
  if (status >= 500) return "server";
  return "unknown";
}

export async function normalizeApiError(response: Response): Promise<ApiError> {
  let payload: unknown = null;
  try { payload = await response.json(); } catch { /* non-JSON error body */ }
  const requestId = isRecord(payload) && typeof payload.requestId === "string" ? payload.requestId : null;
  return new ApiError(messageFromPayload(payload) ?? `Request failed with status ${response.status}`, {
    kind: errorKind(response.status), status: response.status, requestId,
  });
}

export function normalizeNetworkError(error: unknown): ApiError {
  return new ApiError(error instanceof Error ? error.message : "The network request could not be completed", { kind: "network" });
}
