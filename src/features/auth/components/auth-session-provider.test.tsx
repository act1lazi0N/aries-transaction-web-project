import { render, screen, waitFor } from "@testing-library/react";
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
}));

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
  user: { id: "user-1", fullName: "Aries User", email: "user@example.com", role: "USER", isActive: true, createdAt: "2026-08-01T00:00:00Z" },
};

describe("AuthSessionProvider unauthorized recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refreshSession.mockResolvedValue(authenticatedResponse);
  });

  it("clears session state and never replays an unauthorized financial mutation", async () => {
    mocks.apiRequest.mockRejectedValue(new ApiError("expired", { kind: "unauthorized", status: 401, code: "UNAUTHORIZED" }));
    const user = userEvent.setup();
    render(<AuthSessionProvider><SessionHarness /></AuthSessionProvider>);
    expect(await screen.findByText("authenticated")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Execute" }));

    expect(await screen.findByText("unauthenticated")).toBeVisible();
    expect(mocks.apiRequest).toHaveBeenCalledTimes(1);
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
  });

  it("clears authenticated client state when refresh fails", async () => {
    mocks.refreshSession.mockRejectedValue(new ApiError("disabled", { kind: "unauthorized", status: 401, code: "UNAUTHORIZED" }));
    render(<AuthSessionProvider><SessionHarness /></AuthSessionProvider>);

    expect(await screen.findByText("unauthenticated")).toBeVisible();
    await waitFor(() => expect(mocks.refreshSession).toHaveBeenCalledTimes(1));
  });
});

function SessionHarness() {
  const session = useAuthSession();
  return <div><span>{session.status}</span><button type="button" onClick={() => void session.request("/api/v1/transfers", { method: "POST", financialMutation: true }).catch(() => undefined)}>Execute</button></div>;
}
