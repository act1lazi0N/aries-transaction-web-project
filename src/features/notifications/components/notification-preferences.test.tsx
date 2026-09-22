import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationPreferencesPanel } from "@/features/notifications/components/notification-preferences";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  role: "MERCHANT",
  update: vi.fn(),
  request: vi.fn(),
  refetch: vi.fn(),
}));

const preferences = { transactionEmailEnabled: true, webhookAlertEmailEnabled: true, emailVerified: false, version: 7 };

vi.mock("@/features/auth/components/auth-session-provider", () => ({ useAuthSession: () => ({ user: { id: "user-1", role: mocks.role } }) }));
vi.mock("@/features/notifications/queries", () => ({
  useNotificationPreferences: () => ({ isPending: false, isError: false, isFetching: false, data: preferences, refetch: mocks.refetch }),
  useUpdateNotificationPreferences: () => ({ isPending: false, isError: false, error: null, mutateAsync: mocks.update }),
  useRequestEmailVerification: () => ({ isPending: false, isError: false, error: null, mutateAsync: mocks.request }),
}));

describe("NotificationPreferencesPanel", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.role = "MERCHANT";
    mocks.update.mockResolvedValue({ ...preferences, transactionEmailEnabled: false, version: 8 });
    mocks.request.mockResolvedValue({ emailVerified: false });
    mocks.refetch.mockResolvedValue({ data: preferences });
  });

  it("preserves both backend booleans and submits the optimistic version", async () => {
    const user = userEvent.setup();
    render(<NotificationPreferencesPanel />);
    expect(screen.getByRole("switch", { name: "Webhook alert email" })).toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: "Transaction email" }));
    await user.click(screen.getByRole("button", { name: "Save email preferences" }));
    expect(mocks.update).toHaveBeenCalledWith({ transactionEmailEnabled: false, webhookAlertEmailEnabled: true, expectedVersion: 7 });
  });

  it("preserves the draft and requires a reload after a version conflict", async () => {
    mocks.update.mockRejectedValue(new ApiError("Notification preferences changed", { kind: "conflict", status: 409 }));
    const user = userEvent.setup();
    render(<NotificationPreferencesPanel />);
    await user.click(screen.getByRole("switch", { name: "Transaction email" }));
    await user.click(screen.getByRole("button", { name: "Save email preferences" }));
    expect(await screen.findByText(/Your draft is preserved/i)).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Transaction email" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Save email preferences" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Load latest settings" })).toBeInTheDocument();
  });
});
