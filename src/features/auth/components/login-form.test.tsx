import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/features/auth/components/login-form";
import { normalizeApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({ signIn: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/features/auth/components/auth-session-provider", () => ({
  useAuthSession: () => ({ status: "unauthenticated", user: null, signIn: mocks.signIn }),
}));

describe("LoginForm authentication errors", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it.each([
    [403, "ACCOUNT_SUSPENDED", "Your account is suspended. Contact support for help."],
    [401, "UNAUTHORIZED", "The email or password is incorrect. Check your details and try again."],
    [403, "FORBIDDEN", "You do not have permission to do that."],
    [503, "SERVICE_UNAVAILABLE", "The service is unavailable. Try again when it is responding."],
  ])("renders the confirmed backend error %s/%s", async (status, code, message) => {
    mocks.signIn.mockRejectedValue(await normalizeApiError(new Response(JSON.stringify({
      code, message: "Internal error detail must not be rendered",
    }), { status })));
    const user = userEvent.setup();
    render(<LoginForm returnTo="/overview" />);
    await user.type(screen.getByLabelText("Work email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "password-123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText("Work email")).toHaveValue("user@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("password-123");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(mocks.signIn).toHaveBeenCalledTimes(1);
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(screen.queryByText("Internal error detail must not be rendered")).not.toBeInTheDocument();
  });
});
