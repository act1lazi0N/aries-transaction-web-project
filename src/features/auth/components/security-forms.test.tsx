import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { SecurityPanel } from "@/features/auth/components/security-panel";
import { PasswordInput } from "@/components/ui/password-input";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({ replace: vi.fn(), end: vi.fn(), request: vi.fn(), check: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/features/auth/components/auth-session-provider", () => ({ useAuthSession: () => ({ request: mocks.request, endSecuritySession: mocks.end, checkSession: mocks.check }) }));
const clients: QueryClient[] = [];
function mount(children: React.ReactNode, strict = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  const tree = <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const view = render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  return { ...view, client };
}
function ok(status = 200) { return new Response(JSON.stringify({ success: true, data: null }), { status }); }

beforeEach(() => { vi.resetAllMocks(); window.history.replaceState(null, "", "/reset-password?token=Case-Sensitive-Reset"); });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); onlineManager.setOnline(true); vi.unstubAllGlobals(); });

describe("security forms", () => {
  it("does not defer an offline security submission until reconnection", async () => {
    onlineManager.setOnline(false);
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("offline")); vi.stubGlobal("fetch", fetchMock);
    mount(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset instructions" }));
    expect(await screen.findByText(/did not confirm whether this email request/)).toBeVisible();
    await act(async () => { onlineManager.setOnline(true); });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("toggles a password with keyboard without submitting or changing its value", async () => {
    const submit = vi.fn();
    mount(<form onSubmit={submit}><label htmlFor="sample">Password</label><PasswordInput id="sample" visibilityLabel="password" defaultValue="  sample-password  " /></form>);
    const user = userEvent.setup();
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    await user.tab(); await user.tab(); await user.keyboard(" ");
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("  sample-password  ");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveFocus();
    await user.keyboard(" ");
    expect(input).toHaveAttribute("type", "password");
    expect(submit).not.toHaveBeenCalled();
  });

  it("scrubs the reset token once under Strict Mode without consuming it on open", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const { rerender, client } = mount(<ResetPasswordForm />, true);
    expect(await screen.findByLabelText("New password")).toBeVisible();
    expect(window.location.search).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
    rerender(<StrictMode><QueryClientProvider client={client}><ResetPasswordForm /></QueryClientProvider></StrictMode>);
    expect(screen.getByLabelText("New password")).toBeVisible();
  });

  it("submits once, keeps secrets out of mutation state, then clears the session", async () => {
    let resolve!: (response: Response) => void;
    const fetchMock = vi.fn().mockReturnValue(new Promise<Response>(done => { resolve = done; }));
    vi.stubGlobal("fetch", fetchMock);
    const { client } = mount(<ResetPasswordForm />);
    await screen.findByLabelText("New password");
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "  new-password  " } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "  new-password  " } });
    const form = screen.getByRole("button", { name: "Reset password" }).closest("form")!;
    fireEvent.submit(form); fireEvent.submit(form);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ token: "Case-Sensitive-Reset", newPassword: "  new-password  " }));
    expect(client.getMutationCache().getAll().every(mutation => mutation.state.variables === undefined)).toBe(true);
    expect(JSON.stringify(client.getMutationCache().getAll().map(mutation => mutation.state))).not.toContain("new-password");
    await act(async () => { resolve(ok()); });
    await waitFor(() => expect(mocks.end).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" })));
    expect(mocks.replace).toHaveBeenCalledWith("/login");
  });

  it("requires a new link after reload rather than recovering it from storage", async () => {
    window.history.replaceState(null, "", "/reset-password");
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    mount(<ResetPasswordForm />);
    expect(await screen.findByText(/needs the complete reset link/)).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [400, "PASSWORD_RESET_TOKEN_INVALID", /invalid or no longer available/],
    [503, "FEATURE_DISABLED", /not available yet/],
    [500, "ERROR", /did not confirm the outcome/],
  ] as const)("does not replay or claim success for %s %s", async (status, code, message) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code }), { status }));
    vi.stubGlobal("fetch", fetchMock);
    mount(<ResetPasswordForm />);
    await screen.findByLabelText("New password");
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "new-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    expect(await screen.findByText(message)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mocks.end).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Reset password" })).not.toBeInTheDocument();
  });

  it("renders generic forgot acceptance and prevents rapid resends", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok(202)); vi.stubGlobal("fetch", fetchMock);
    mount(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "unknown@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset instructions" }));
    expect(await screen.findByText(/If an eligible account exists/)).toBeVisible();
    expect(screen.getByRole("button", { name: /Request again in/ })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mocks.end).not.toHaveBeenCalled();
  });

  it("allows correction after a current-password rejection and locks both operations", async () => {
    mocks.request.mockRejectedValueOnce(new ApiError("incorrect", { kind: "validation", code: "CURRENT_PASSWORD_INVALID", status: 400 })).mockResolvedValueOnce(null);
    mount(<SecurityPanel />);
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "old-password" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "new-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    await screen.findAllByText("Your current password is incorrect.");
    expect(screen.getByLabelText("New password")).toHaveValue("new-password");
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "correct-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect(mocks.end).toHaveBeenCalledOnce());
    expect(mocks.request).toHaveBeenCalledTimes(2);
  });

  it("confirms logout-all explicitly and never calls a current-session check global success", async () => {
    mocks.request.mockRejectedValue(new ApiError("timeout", { kind: "network" }));
    mocks.check.mockResolvedValue("active");
    mount(<SecurityPanel />);
    await userEvent.click(screen.getByRole("button", { name: "Sign out of all devices" }));
    expect(mocks.request).not.toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "Confirm sign out of all devices" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Confirm sign out everywhere" }));
    await userEvent.click(await screen.findByRole("button", { name: "Check this session" }));
    expect(await screen.findByText(/still active.*remains unconfirmed/)).toBeVisible();
    expect(mocks.end).not.toHaveBeenCalled();
    expect(mocks.request).toHaveBeenCalledOnce();
  });
});
