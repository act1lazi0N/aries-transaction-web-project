import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedWorkspace } from "@/features/auth/components/protected-workspace";

const mocks = vi.hoisted(() => ({ role: "USER", replace: vi.fn(), featureRender: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/features/auth/components/auth-gate", () => ({ AuthGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/features/accounts/components/account-required-gate", () => ({ AccountRequiredGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/features/auth/components/auth-session-provider", () => ({ useAuthSession: () => ({ user: { role: mocks.role } }) }));

function Feature() {
  mocks.featureRender();
  return <div>Protected feature</div>;
}

describe("ProtectedWorkspace", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.role = "USER";
  });

  it("renders an allowed customer workspace", () => {
    render(<ProtectedWorkspace capability="transfers:create"><Feature /></ProtectedWorkspace>);
    expect(screen.getByText("Protected feature")).toBeVisible();
    expect(mocks.featureRender).toHaveBeenCalledOnce();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("redirects a denied route before mounting its feature", async () => {
    render(<ProtectedWorkspace capability="controls:operate"><Feature /></ProtectedWorkspace>);
    expect(screen.getByRole("status")).toHaveTextContent("Opening your workspace");
    expect(screen.queryByText("Protected feature")).not.toBeInTheDocument();
    expect(mocks.featureRender).not.toHaveBeenCalled();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/overview"));
  });

  it("uses the operational landing for denied operational routes", async () => {
    mocks.role = "OPERATOR";
    render(<ProtectedWorkspace capability="overview:view"><Feature /></ProtectedWorkspace>);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/operations"));
    expect(mocks.featureRender).not.toHaveBeenCalled();
  });

  it("allows only Settings for an unknown role", async () => {
    mocks.role = "AUDITOR";
    const { rerender } = render(<ProtectedWorkspace capability="settings:view"><Feature /></ProtectedWorkspace>);
    expect(screen.getByText("Protected feature")).toBeVisible();
    mocks.featureRender.mockClear();
    rerender(<ProtectedWorkspace capability="transactions:view"><Feature /></ProtectedWorkspace>);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/settings"));
    expect(mocks.featureRender).not.toHaveBeenCalled();
  });
});
