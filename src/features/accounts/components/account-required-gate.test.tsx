import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountRequiredGate } from "@/features/accounts/components/account-required-gate";

const mocks = vi.hoisted(() => ({
  role: "USER",
  query: {} as Record<string, unknown>,
  refetch: vi.fn(),
  replace: vi.fn(),
  useAccounts: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/features/accounts/queries", () => ({ useAccounts: (enabled: boolean) => { mocks.useAccounts(enabled); return mocks.query; } }));
vi.mock("@/features/auth/components/auth-session-provider", () => ({ useAuthSession: () => ({ status: "authenticated", user: { fullName: "Aries User", role: mocks.role } }) }));
vi.mock("@/features/auth/components/session-controls", () => ({ SessionControls: () => <button type="button">Sign out</button> }));
vi.mock("@/features/accounts/components/account-creation-workspace", () => ({ AccountCreationWorkspace: ({ onComplete }: { onComplete: (account: { id: string }) => void }) => <div><div>First account onboarding</div><button type="button" onClick={() => onComplete({ id: "account-1" })}>Complete onboarding</button></div> }));

describe("AccountRequiredGate", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.role = "USER";
    mocks.query = { data: [], isPending: false, isError: false, refetch: mocks.refetch };
  });

  it("shows non-skippable onboarding for an eligible user with an authoritative empty list", () => {
    render(<AccountRequiredGate><div>Protected workspace</div></AccountRequiredGate>);
    expect(screen.getByText("First account onboarding")).toBeVisible();
    expect(screen.queryByText("Protected workspace")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  it("does not mistake an unavailable account list for an empty list", async () => {
    const user = userEvent.setup();
    mocks.query = { data: undefined, isPending: false, isError: true, error: new Error("offline"), refetch: mocks.refetch };
    render(<AccountRequiredGate><div>Protected workspace</div></AccountRequiredGate>);
    expect(screen.getByRole("alert")).toHaveTextContent("will not assume an unavailable account list is empty");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it("lets operational roles and users with accounts continue", () => {
    mocks.role = "ADMIN";
    const { rerender } = render(<AccountRequiredGate><div>Protected workspace</div></AccountRequiredGate>);
    expect(screen.getByText("Protected workspace")).toBeVisible();
    expect(mocks.useAccounts).toHaveBeenCalledWith(false);
    mocks.role = "USER";
    mocks.query = { data: [{ id: "account-1" }], isPending: false, isError: false, refetch: mocks.refetch };
    rerender(<AccountRequiredGate><div>Protected workspace</div></AccountRequiredGate>);
    expect(screen.getByText("Protected workspace")).toBeVisible();
  });

  it("opens the new account overview without revealing the previous workspace", async () => {
    const user = userEvent.setup();
    render(<AccountRequiredGate><div>Protected workspace</div></AccountRequiredGate>);
    await user.click(screen.getByRole("button", { name: "Complete onboarding" }));
    expect(screen.queryByText("Protected workspace")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Opening your account overview" })).toBeVisible();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/overview?accountId=account-1"));
  });
});
