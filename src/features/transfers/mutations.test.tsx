import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useExecuteTransferPreview } from "./mutations";
import { readTransferRecovery, saveTransferRecovery } from "./recovery";
import { ApiError } from "@/lib/api/errors";
const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("@/features/auth/components/auth-session-provider", () => ({ useAuthSession: () => ({ user: { id: "owner" }, request: vi.fn() }) }));
vi.mock("./api", () => ({ executeTransferPreview: mocks.execute, createTransferPreview: vi.fn() }));
const request = { previewId: "preview", idempotencyKey: "stable-key-123456789", authorizationId: "authorization" };
function setup() {
  const cache = new QueryClient();
  return renderHook(() => useExecuteTransferPreview(), { wrapper: ({ children }) => <QueryClientProvider client={cache}>{children}</QueryClientProvider> });
}
describe("transfer execution recovery", () => {
  beforeEach(() => { sessionStorage.clear(); vi.clearAllMocks(); });
  afterEach(cleanup);
  it("keeps the original operation when a later replay cannot find its preview", async () => {
    mocks.execute.mockRejectedValueOnce(new ApiError("response lost", { kind: "network" }));
    const hook = setup();
    await act(async () => { await expect(hook.result.current.mutateAsync(request)).rejects.toThrow(); });
    expect(readTransferRecovery("owner")).toMatchObject(request);
    mocks.execute.mockRejectedValueOnce(new ApiError("expired", { kind: "conflict", code: "TRANSFER_PREVIEW_UNAVAILABLE" }));
    await act(async () => { await expect(hook.result.current.mutateAsync(request)).rejects.toMatchObject({ kind: "unknown", code: "REPLAY_UNCONFIRMED" }); });
    expect(readTransferRecovery("owner")).toMatchObject(request);
    expect(mocks.execute.mock.calls.map(call => call[0])).toEqual([request, request]);
  });
  it("clears a new attempt only after a definitive rejection or valid transaction response", async () => {
    mocks.execute.mockRejectedValueOnce(new ApiError("insufficient", { kind: "validation", code: "INSUFFICIENT_BALANCE" }));
    const hook = setup();
    await act(async () => { await expect(hook.result.current.mutateAsync(request)).rejects.toThrow(); });
    expect(readTransferRecovery("owner")).toBeNull();
    saveTransferRecovery("owner", request);
    mocks.execute.mockResolvedValueOnce({ id: "transaction", status: "PENDING" });
    await act(async () => { await hook.result.current.mutateAsync(request); });
    expect(readTransferRecovery("owner")).toBeNull();
  });
  it("does not send or erase another unresolved request", async () => {
    saveTransferRecovery("owner", request); const hook = setup();
    await act(async () => { await expect(hook.result.current.mutateAsync({ ...request, previewId: "another-preview" })).rejects.toMatchObject({ code: "RECOVERY_UNAVAILABLE" }); });
    expect(mocks.execute).not.toHaveBeenCalled(); expect(readTransferRecovery("owner")).toMatchObject(request);
  });
});
