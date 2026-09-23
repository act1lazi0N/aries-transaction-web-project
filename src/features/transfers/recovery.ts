import type { TransferExecuteRequest } from "./types";
import { ApiError } from "@/lib/api/errors";

const key = "aries.transfer-recovery.v1";
export type TransferRecovery = TransferExecuteRequest & { version: 1; userId: string };
export function clearTransferRecovery() { try { sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ } }
export function readTransferRecovery(userId: string): TransferRecovery | null {
  try {
    const raw = sessionStorage.getItem(key); if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") throw new Error();
    const v = value as Record<string, unknown>;
    if (v.version !== 1 || v.userId !== userId || typeof v.previewId !== "string" || !v.previewId || typeof v.idempotencyKey !== "string" || v.idempotencyKey.length < 16 || v.idempotencyKey.length > 64 || (v.authorizationId !== undefined && typeof v.authorizationId !== "string")) throw new Error();
    return { version: 1, userId, previewId: v.previewId, idempotencyKey: v.idempotencyKey, ...(typeof v.authorizationId === "string" ? { authorizationId: v.authorizationId } : {}) };
  } catch { clearTransferRecovery(); return null; }
}
export function saveTransferRecovery(userId: string, request: TransferExecuteRequest) {
  try {
    const previous = readTransferRecovery(userId);
    if (previous && (previous.previewId !== request.previewId || previous.idempotencyKey !== request.idempotencyKey)) throw new Error();
    sessionStorage.setItem(key, JSON.stringify({ version: 1, userId, previewId: request.previewId, idempotencyKey: request.idempotencyKey, ...(request.authorizationId ? { authorizationId: request.authorizationId } : {}) }));
  } catch { throw new ApiError("The transfer was not sent. Recovery storage is unavailable or another transfer needs checking. Reload Transfers before continuing.", { kind: "conflict", code: "RECOVERY_UNAVAILABLE" }); }
}
