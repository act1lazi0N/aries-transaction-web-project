import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmailDeliveryWorkspace } from "@/features/notifications/components/email-delivery-workspace";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({ redrive: vi.fn(), refetch: vi.fn(), replace: vi.fn() }));

const deadLettered = {
  id: "delivery-1",
  purpose: "TRANSACTION_NOTIFICATION" as const,
  status: "DEAD_LETTERED" as const,
  attemptCount: 5,
  cycleAttemptCount: 5,
  redriveCount: 1,
  lastErrorCode: "SMTP_TIMEOUT",
  nextAttemptAt: null,
  deliveredAt: null,
  createdAt: "2026-09-05T10:00:00Z",
  updatedAt: "2026-09-05T10:10:00Z",
};

vi.mock("next/navigation", () => ({ usePathname: () => "/operations/notification-email-deliveries", useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/features/notifications/queries", () => ({
  useEmailDeliveries: () => ({ isPending: false, isError: false, isFetching: false, data: { content: [deadLettered], page: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true }, refetch: mocks.refetch }),
  useRedriveEmailDelivery: () => ({ isPending: false, variables: undefined, mutateAsync: mocks.redrive }),
}));

describe("EmailDeliveryWorkspace", () => {
  it("treats a rejected security email redrive as rejected and refreshes the queue", async () => {
    mocks.redrive.mockRejectedValue(new ApiError("ineligible", { kind: "conflict", status: 409 }));
    render(<EmailDeliveryWorkspace initialFilters={{ status: "DEAD_LETTERED", page: 0, size: 20 }} />);
    await userEvent.click(screen.getByRole("button", { name: "Redrive" }));
    expect(await screen.findByText("Redrive rejected")).toBeVisible();
    expect(mocks.refetch).toHaveBeenCalledOnce();
    expect(screen.queryByText("Redrive outcome unknown")).not.toBeInTheDocument();
  });
  beforeEach(() => {
    cleanup(); vi.clearAllMocks();
    mocks.refetch.mockResolvedValue({ data: { content: [deadLettered] } });
  });

  it("presents an accepted redrive as queued rather than delivered", async () => {
    mocks.redrive.mockResolvedValue({ ...deadLettered, status: "PENDING", cycleAttemptCount: 0, redriveCount: 2, lastErrorCode: null, nextAttemptAt: "2026-09-05T10:11:00Z" });
    const user = userEvent.setup();
    render(<EmailDeliveryWorkspace initialFilters={{ status: "DEAD_LETTERED", page: 0, size: 20 }} />);
    await user.click(screen.getByRole("button", { name: "Redrive" }));
    expect(await screen.findByText(/returned Pending/i)).toBeInTheDocument();
    expect(screen.getByText(/Delivery itself is not yet confirmed/i)).toBeInTheDocument();
    expect(screen.queryByText(/delivery confirmed/i)).not.toBeInTheDocument();
  });

  it("requires a queue recheck after an ambiguous redrive failure", async () => {
    mocks.redrive.mockRejectedValue(new ApiError("Network unavailable", { kind: "network" }));
    const user = userEvent.setup();
    render(<EmailDeliveryWorkspace initialFilters={{ status: "DEAD_LETTERED", page: 0, size: 20 }} />);
    await user.click(screen.getByRole("button", { name: "Redrive" }));
    expect(await screen.findByText("Redrive outcome unknown")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recheck queue" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Redrive" })).not.toBeInTheDocument();
  });
});
