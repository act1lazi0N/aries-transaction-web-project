import { StrictMode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmailVerificationWorkspace } from "@/features/notifications/components/email-verification-workspace";

const mocks = vi.hoisted(() => ({ confirm: vi.fn() }));

vi.mock("@/features/auth/components/auth-session-provider", () => ({ useAuthSession: () => ({ status: "unauthenticated" }) }));
vi.mock("@/features/notifications/api", () => ({ confirmEmailVerification: mocks.confirm }));

describe("EmailVerificationWorkspace", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue({ emailVerified: true });
  });

  it("submits an email token only once under Strict Mode", async () => {
    render(<StrictMode><EmailVerificationWorkspace token="one-time-token" /></StrictMode>);
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(mocks.confirm).toHaveBeenCalledWith("one-time-token");
    expect(await screen.findByRole("heading", { name: "Your email is verified" })).toBeInTheDocument();
  });

  it("does not call the backend when the token is missing", () => {
    render(<EmailVerificationWorkspace />);
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Verification token is missing" })).toBeInTheDocument();
  });
});
