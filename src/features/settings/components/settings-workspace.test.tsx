import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsWorkspace } from "@/features/settings/components/settings-workspace";

const user = {
  id: "user-1",
  fullName: "Aries Operator",
  email: "operator@example.com",
  role: "OPERATOR",
  isActive: true,
  emailVerified: true,
  createdAt: "2026-08-12T00:00:00Z",
};

vi.mock("@/features/auth/components/auth-session-provider", () => ({
  useAuthSession: () => ({ user }),
}));

vi.mock("@/features/notifications/components/notification-preferences", () => ({
  NotificationPreferencesPanel: () => <section aria-label="Notification preferences">Notification preferences</section>,
}));

describe("SettingsWorkspace", () => {
  it("renders profile fields with clear read-only copy", () => {
    render(<SettingsWorkspace />);

    expect(screen.getByRole("heading", { name: "Profile and notifications" })).toBeInTheDocument();
    expect(screen.getByText(/read-only identity details/i)).toBeInTheDocument();
    expect(screen.getByText("Aries Operator")).toBeInTheDocument();
    expect(screen.getByText("operator@example.com")).toBeInTheDocument();
    expect(screen.getByText("Operator")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Notification preferences" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
