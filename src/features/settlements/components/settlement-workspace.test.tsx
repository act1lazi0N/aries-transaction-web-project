import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettlementWorkspace } from "@/features/settlements/components/settlement-workspace";

const sessionState = vi.hoisted(() => ({ user: { id: "user-1", fullName: "Aries User", email: "user@example.com", role: "USER", isActive: true, emailVerified: false, createdAt: "2026-08-12T00:00:00Z" } }));
const refetch = vi.fn();

vi.mock("@/features/auth/components/auth-session-provider", () => ({
  useAuthSession: () => sessionState,
}));

vi.mock("@/features/settlements/queries", () => ({
  useSettlementBatch: () => ({ isLoading: false, isFetching: false, data: undefined, error: null, refetch }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

describe("SettlementWorkspace", () => {
  afterEach(() => {
    sessionState.user.role = "USER";
    vi.clearAllMocks();
  });

  it("does not expose settlement controls to unauthorized roles", () => {
    render(<SettlementWorkspace />);

    expect(screen.getByRole("alert")).toHaveTextContent("You do not have access to settlements");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("keeps execution paused when the preview contract is unavailable", () => {
    sessionState.user.role = "OPERATOR";
    render(<SettlementWorkspace />);

    expect(screen.getByText("Settlement execution is paused")).toBeInTheDocument();
    expect(screen.getByText(/does not yet provide a preview/i)).toBeInTheDocument();
    expect(screen.getByText("No settlement batch selected")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create|execute|run settlement/i })).not.toBeInTheDocument();
  });
});
