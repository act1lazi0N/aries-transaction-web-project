import { ApiError, normalizeApiError, normalizeNetworkError } from "@/lib/api/errors";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  requestId?: string;
  timestamp?: string;
};

export async function apiRequest<T>(path: string, options: RequestInit & { accessToken?: string } = {}): Promise<T> {
  const { accessToken, ...requestInit } = options;
  const headers = new Headers(requestInit.headers);
  headers.set("Accept", "application/json");
  if (requestInit.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...requestInit, headers, credentials: "include" });
  } catch (error) {
    throw normalizeNetworkError(error);
  }

  if (!response.ok) throw await normalizeApiError(response);
  let envelope: unknown;
  try { envelope = await response.json(); } catch { throw new ApiError("The server returned an invalid response", { kind: "unknown", status: response.status }); }
  if (!isApiResponse<T>(envelope) || !envelope.success) throw new ApiError(envelopeMessage(envelope) ?? "The server rejected the response", { kind: "unknown", status: response.status });
  return envelope.data;
}

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return typeof value === "object" && value !== null && "success" in value && "data" in value && (value as { success: unknown }).success === true;
}

function envelopeMessage(value: unknown): string | null {
  return typeof value === "object" && value !== null && typeof (value as { message?: unknown }).message === "string" ? (value as { message: string }).message : null;
}
