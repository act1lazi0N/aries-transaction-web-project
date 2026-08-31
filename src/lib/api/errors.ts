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
  readonly code: string | null;
  readonly errors: Record<string, string> | null;
  readonly requestId: string | null;
  readonly retryAfterSeconds: number | null;

  constructor(message: string, options: {
    kind: ApiErrorKind;
    status?: number | null;
    code?: string | null;
    errors?: Record<string, string> | null;
    requestId?: string | null;
    retryAfterSeconds?: number | null;
  }) {
    super(message);
    this.name = "ApiError";
    this.kind = options.kind;
    this.status = options.status ?? null;
    this.code = options.code ?? null;
    this.errors = options.errors ?? null;
    this.requestId = options.requestId ?? null;
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
  }
}

export function userFacingErrorMessage(error: unknown, fallback = "We could not complete that request. Try again.") {
  if (!(error instanceof ApiError)) return fallback;
  switch (error.kind) {
    case "unauthorized": return "Your sign-in session has expired. Sign in again.";
    case "forbidden": return "You do not have permission to do that.";
    case "validation": return "Check the entered information and try again.";
    case "conflict": return "This request conflicts with the current transaction state.";
    case "rate_limited": return "There are too many requests right now. Wait a moment and try again.";
    case "server": return "The service is unavailable. Try again when it is responding.";
    case "network": return "We could not reach the service. Check your connection and try again.";
    case "unknown": return fallback;
  }
}

/**
 * Copy for a financial mutation after the transport cannot establish an
 * authoritative outcome. A timeout or 5xx does not prove that the backend did
 * not accept the request, so callers must direct the user to status recovery.
 */
export function financialMutationErrorMessage(error: unknown, fallback = "We could not confirm the operation status. Check its status before trying again.") {
  if (!(error instanceof ApiError)) return fallback;
  switch (error.kind) {
    case "unauthorized": return "Your sign-in session has expired. Sign in again. The operation status is not confirmed.";
    case "forbidden": return "You do not have permission to do that.";
    case "validation": return "Check the entered information and try again. The request was rejected before processing.";
    case "conflict": return "The request conflicts with the current state. Check the operation status before trying again.";
    case "rate_limited": return "There are too many requests right now. Check the operation status before trying again.";
    case "server": return "The service did not confirm the operation. Check its status before trying again.";
    case "network": return "We could not confirm the operation because the service could not be reached. Check its status before trying again.";
    case "unknown": return fallback;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function messageFromPayload(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  return typeof payload.message === "string" ? payload.message : null;
}

function codeFromPayload(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  return typeof payload.code === "string" && payload.code.length > 0 ? payload.code : null;
}

function fieldErrorsFromPayload(payload: unknown): Record<string, string> | null {
  if (!isRecord(payload) || !isRecord(payload.errors)) return null;
  const entries = Object.entries(payload.errors).filter((entry): entry is [string, string] => typeof entry[1] === "string");
  return entries.length > 0 ? Object.fromEntries(entries) : null;
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
    kind: errorKind(response.status),
    status: response.status,
    code: codeFromPayload(payload),
    errors: fieldErrorsFromPayload(payload),
    requestId,
    retryAfterSeconds: parseRetryAfterSeconds(response.headers.get("Retry-After")),
  });
}

export function normalizeNetworkError(error: unknown): ApiError {
  return new ApiError(error instanceof Error ? error.message : "The network request could not be completed", { kind: "network" });
}

export function parseRetryAfterSeconds(value: string | null, now = Date.now()): number | null {
  if (!value) return null;
  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) {
    const seconds = Number(normalized);
    return Number.isSafeInteger(seconds) ? seconds : null;
  }
  const timestamp = Date.parse(normalized);
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.ceil((timestamp - now) / 1000));
}
