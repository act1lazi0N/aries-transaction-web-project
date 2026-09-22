import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationWorkspace } from "@/features/notifications/components/notification-workspace";
import type { NotificationRecord } from "@/features/notifications/types";

const mocks = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markRead: vi.fn(),
  markAll: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/notifications", useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/features/auth/components/auth-session-provider", () => ({ useAuthSession: () => ({ status: "authenticated", user: { id: "user-1", role: "USER" }, request: vi.fn() }) }));
vi.mock("@/features/notifications/api", () => ({
  getNotifications: mocks.getNotifications,
  getUnreadNotificationCount: mocks.getUnreadCount,
  markNotificationRead: mocks.markRead,
  markAllNotificationsRead: mocks.markAll,
}));

const notification: NotificationRecord = {
  id: "notification-1",
  type: "TRANSFER_COMPLETED" as const,
  title: "Transfer completed",
  message: "Your completed transfer is ready to review.",
  data: { kind: "transaction" as const, transactionId: "transaction-1", originalTransactionId: null, operation: "TRANSFER" as const, amount: "1234567890123456.78", currency: "USD", direction: "OUTGOING" as const, fromAccountDisplay: "********1111", toAccountDisplay: "********2222", occurredAt: "2026-09-05T10:00:00Z" },
  occurredAt: "2026-09-05T10:00:00Z",
  readAt: null,
  createdAt: "2026-09-05T10:00:01Z",
};

function page(readAt: string | null = null) {
  return { content: [{ ...notification, readAt }], page: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true };
}

function renderWorkspace() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><NotificationWorkspace initialFilters={{ status: "ALL", page: 0, size: 20 }} /></QueryClientProvider>);
}

describe("NotificationWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getNotifications.mockResolvedValue(page());
    mocks.getUnreadCount.mockResolvedValue(1);
    mocks.markAll.mockResolvedValue({ updatedCount: 1, readThrough: "2026-09-05T11:00:00Z" });
  });

  it("shows exact confirmed transaction details and an explicit read action", async () => {
    mocks.markRead.mockResolvedValue({ ...notification, readAt: "2026-09-05T11:00:00Z" });
    renderWorkspace();
    expect(await screen.findByRole("heading", { name: "Transfer completed" })).toBeInTheDocument();
    expect(screen.getByText(/1234567890123456\.78/)).toBeInTheDocument();
    expect(screen.getByText("********1111 → ********2222")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view transaction/i })).toHaveAttribute("href", "/transactions?transactionId=transaction-1");
  });

  it("prevents a duplicate read action while the service outcome is pending", async () => {
    let resolveRead!: (value: NotificationRecord) => void;
    const pendingRead = new Promise<NotificationRecord>(resolve => { resolveRead = resolve; });
    mocks.markRead.mockReturnValue(pendingRead);
    const user = userEvent.setup();
    renderWorkspace();
    const button = await screen.findByRole("button", { name: "Mark as read" });
    await user.click(button);
    expect(button).toBeDisabled();
    await user.click(button);
    expect(mocks.markRead).toHaveBeenCalledTimes(1);
    mocks.getNotifications.mockResolvedValue(page("2026-09-05T11:00:00Z"));
    mocks.getUnreadCount.mockResolvedValue(0);
    resolveRead({ ...notification, readAt: "2026-09-05T11:00:00Z" });
    expect(await screen.findByText("The service confirmed the updated read state.")).toBeInTheDocument();
  });
});
