import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsWorkspace } from "@/features/settings/components/settings-workspace";

const user = {
  id: "user-1",
  fullName: "Aries Operator",
  email: "operator@example.com",
  role: "OPERATOR",
  isActive: true,
  createdAt: "2026-08-12T00:00:00Z",
};

vi.mock("@/features/auth/components/auth-session-provider", () => ({
  useAuthSession: () => ({ user }),
}));

describe("SettingsWorkspace", () => {
  it("renders profile fields with clear read-only copy", () => {
    render(<SettingsWorkspace />);

    expect(screen.getByRole("heading", { name: "Profile and access" })).toBeInTheDocument();
    expect(screen.getByText(/information is read-only and cannot be changed here/i)).toBeInTheDocument();
    expect(screen.getByText("Aries Operator")).toBeInTheDocument();
    expect(screen.getByText("operator@example.com")).toBeInTheDocument();
    expect(screen.getByText("Operator")).toBeInTheDocument();
    expect(screen.getByText(/Notification preferences and session controls are not available yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
