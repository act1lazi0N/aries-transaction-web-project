import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthSessionProvider, useAuthSession } from "@/features/auth/components/auth-session-provider";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  refreshSession: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  publish: vi.fn(),
  receive: undefined as (() => void) | undefined,
}));
vi.mock("@/features/auth/session-events", () => ({ connectSessionEvents: (receive: () => void) => { mocks.receive = receive; return { publish: mocks.publish, close: vi.fn() }; } }));

vi.mock("@/lib/api/client", () => ({ apiRequest: mocks.apiRequest }));
vi.mock("@/features/auth/api", () => ({
  refreshSession: mocks.refreshSession,
  login: mocks.login,
  logout: mocks.logout,
  register: mocks.register,
}));

const authenticatedResponse = {
  accessToken: "access-token",
  tokenType: "Bearer" as const,
  expiresIn: 900,
  user: { id: "user-1", fullName: "Aries User", email: "user@example.com", role: "USER", isActive: true, emailVerified: false, createdAt: "2026-08-01T00:00:00Z" },
};

describe("AuthSessionProvider unauthorized recovery", () => {
  beforeEach(() => {
    cleanup(); vi.resetAllMocks();
    mocks.refreshSession.mockResolvedValue(authenticatedResponse);
  });

  it("clears session state and never replays an unauthorized financial mutation", async () => {
    mocks.apiRequest.mockRejectedValue(new ApiError("expired", { kind: "unauthorized", status: 401, code: "UNAUTHORIZED" }));
    const user = userEvent.setup();
    renderSession();
    expect(await screen.findByText("authenticated")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Execute" }));

    expect(await screen.findByText("unauthenticated")).toBeVisible();
    expect(mocks.apiRequest).toHaveBeenCalledTimes(1);
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
  });

  it("clears authenticated client state when refresh fails", async () => {
    mocks.refreshSession.mockRejectedValue(new ApiError("disabled", { kind: "unauthorized", status: 401, code: "UNAUTHORIZED" }));
    renderSession();

    expect(await screen.findByText("unauthenticated")).toBeVisible();
    await waitFor(() => expect(mocks.refreshSession).toHaveBeenCalledTimes(1));
  });

  it("clears cached data and ignores a bootstrap refresh arriving after a security operation", async () => {
    let resolveRefresh!: (value: typeof authenticatedResponse) => void;
    mocks.refreshSession.mockReturnValue(new Promise(resolve => { resolveRefresh = resolve; }));
    const client = renderSession();
    client.setQueryData(["private"], { balance: "123" });
    await userEvent.click(screen.getByRole("button", { name: "End security session" }));
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    await act(async () => { resolveRefresh(authenticatedResponse); });
    expect(screen.getByText("unauthenticated")).toBeVisible();
    expect(mocks.publish).toHaveBeenCalledOnce();
    expect(screen.getByText("Security operation confirmed")).toBeVisible();
  });

  it("does not let an old rejected request invalidate a new successful login", async () => {
    let rejectRequest!: (reason: unknown) => void;
    mocks.apiRequest.mockReturnValue(new Promise((_resolve, reject) => { rejectRequest = reject; }));
    mocks.login.mockResolvedValue({ ...authenticatedResponse, accessToken: "new-session" });
    renderSession();
    await screen.findByText("authenticated");
    await userEvent.click(screen.getByRole("button", { name: "Execute" }));
    await userEvent.click(screen.getByRole("button", { name: "New login" }));
    await act(async () => { rejectRequest(new ApiError("revoked", { kind: "unauthorized", status: 401 })); });
    expect(screen.getByText("authenticated")).toBeVisible();
    expect(mocks.refreshSession).toHaveBeenCalledOnce();
  });

  it("rejects old successful data after ending a session", async () => {
    let resolveRequest!: (value: unknown) => void;
    mocks.apiRequest.mockReturnValue(new Promise(resolve => { resolveRequest = resolve; }));
    renderSession();
    await screen.findByText("authenticated");
    await userEvent.click(screen.getByRole("button", { name: "Execute" }));
    await userEvent.click(screen.getByRole("button", { name: "End security session" }));
    await act(async () => { resolveRequest({ balance: "123" }); });
    expect(screen.getByText("unauthenticated")).toBeVisible();
  });

  it("verifies a tab event without refresh and retains a valid newer session", async () => {
    mocks.apiRequest.mockResolvedValue(authenticatedResponse.user);
    renderSession();
    await screen.findByText("authenticated");
    await act(async () => { mocks.receive?.(); });
    expect(mocks.apiRequest).toHaveBeenCalledWith("/api/v1/auth/me", expect.objectContaining({ accessToken: "access-token", cache: "no-store" }));
    expect(screen.getByText("authenticated")).toBeVisible();
    expect(mocks.refreshSession).toHaveBeenCalledOnce();
    mocks.apiRequest.mockRejectedValue(new ApiError("revoked", { kind: "unauthorized", status: 401 }));
    await act(async () => { mocks.receive?.(); });
    expect(screen.getByText("unauthenticated")).toBeVisible();
    expect(mocks.publish).not.toHaveBeenCalled();
  });

  it("clears an offline receiving tab without claiming a confirmed global result", async () => {
    mocks.apiRequest.mockRejectedValue(new ApiError("offline", { kind: "network" }));
    const client = renderSession();
    await screen.findByText("authenticated");
    client.setQueryData(["private"], { balance: "123" });
    await act(async () => { mocks.receive?.(); });
    expect(screen.getByText("unauthenticated")).toBeVisible();
    expect(screen.getByText(/could not be checked/)).toBeVisible();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(mocks.refreshSession).toHaveBeenCalledOnce();
  });
});

function renderSession() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AuthSessionProvider><SessionHarness /></AuthSessionProvider></QueryClientProvider>);
  return client;
}

function SessionHarness() {
  const session = useAuthSession();
  return <div><span>{session.status}</span><p>{session.notice?.message}</p><button type="button" onClick={() => void session.request("/api/v1/transfers", { method: "POST", financialMutation: true }).catch(() => undefined)}>Execute</button><button onClick={() => session.endSecuritySession({ tone: "success", message: "Security operation confirmed" })}>End security session</button><button onClick={() => void session.signIn({ email: "user@example.com", password: "sample-password" })}>New login</button></div>;
}
