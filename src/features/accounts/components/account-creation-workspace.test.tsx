import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountCreationWorkspace } from "@/features/accounts/components/account-creation-workspace";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  reset: vi.fn(),
  refetch: vi.fn(),
  push: vi.fn(),
}));

const account = {
  id: "account-1", userId: "user-1", accountNumber: "100000000001", accountType: "PERSONAL", balance: "0", currency: "VND", status: "ACTIVE", createdAt: "2026-08-29T00:00:01Z", description: "Daily",
};

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/features/accounts/mutations", () => ({ useCreateAccount: () => ({ mutateAsync: mocks.mutateAsync, reset: mocks.reset }) }));
vi.mock("@/features/accounts/queries", async importOriginal => {
  const original = await importOriginal<typeof import("@/features/accounts/queries")>();
  return { ...original, useAccounts: () => ({ data: [], isFetching: false, isSuccess: true, refetch: mocks.refetch }) };
});
vi.mock("@/features/auth/components/auth-session-provider", () => ({ useAuthSession: () => ({ status: "authenticated", user: { id: "user-1", role: "USER" } }) }));

describe("AccountCreationWorkspace", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    sessionStorage.clear();
    mocks.refetch.mockResolvedValue({ data: [] });
  });

  it("reviews and submits only one authoritative account request", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    let resolveCreate: (value: typeof account) => void = () => undefined;
    mocks.mutateAsync.mockImplementation(() => new Promise(resolve => { resolveCreate = resolve; }));
    renderWorkspace(<AccountCreationWorkspace mode="onboarding" onComplete={onComplete} />);

    await screen.findByRole("button", { name: "Review account" });
    await user.click(screen.getByRole("radio", { name: /Personal/ }));
    await user.type(screen.getByLabelText(/Description/), "Daily");
    await user.click(screen.getByRole("button", { name: "Review account" }));
    await user.dblClick(screen.getByRole("button", { name: "Create financial account" }));

    expect(mocks.mutateAsync).toHaveBeenCalledTimes(1);
    const request = mocks.mutateAsync.mock.calls[0]?.[0];
    expect(request).toMatchObject({ accountType: "PERSONAL", currency: "VND", description: "Daily" });
    expect(request.idempotencyKey).toMatch(/^.{16,64}$/);
    resolveCreate(account);
    expect(await screen.findByRole("heading", { name: "Financial account created" })).toBeVisible();
    expect(screen.getByText("100000000001")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Continue to workspace" }));
    expect(onComplete).toHaveBeenCalledWith(account);
  });

  it("keeps the same key when an unknown result is explicitly replayed", async () => {
    const user = userEvent.setup();
    mocks.mutateAsync.mockRejectedValueOnce(new ApiError("network", { kind: "network", requestId: "request-1" })).mockResolvedValueOnce(account);
    renderWorkspace(<AccountCreationWorkspace mode="onboarding" onComplete={vi.fn()} />);

    await screen.findByRole("button", { name: "Review account" });
    await user.click(screen.getByRole("radio", { name: /Personal/ }));
    await user.click(screen.getByRole("button", { name: "Review account" }));
    await user.click(screen.getByRole("button", { name: "Create financial account" }));
    expect(await screen.findByRole("heading", { name: "Account creation status unavailable" })).toBeVisible();
    expect(screen.getByText(/request-1/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Retry same request" }));
    expect(await screen.findByRole("heading", { name: "Financial account created" })).toBeVisible();
    expect(mocks.mutateAsync).toHaveBeenCalledTimes(2);
    expect(mocks.mutateAsync.mock.calls[1]?.[0].idempotencyKey).toBe(mocks.mutateAsync.mock.calls[0]?.[0].idempotencyKey);
    await waitFor(() => expect(sessionStorage.length).toBe(0));
  });
});

function renderWorkspace(node: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}
