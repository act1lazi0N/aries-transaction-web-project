import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NavigationLinks } from "@/components/navigation-links";

const mocks = vi.hoisted(() => ({ role: "USER", pathname: "/overview" }));

vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("@/features/auth/components/auth-session-provider", () => ({ useAuthSession: () => ({ user: { role: mocks.role } }) }));

describe("NavigationLinks", () => {
  beforeEach(() => {
    cleanup();
    mocks.role = "USER";
    mocks.pathname = "/overview";
  });

  it.each(["USER", "MERCHANT"])("shows only customer navigation for %s", role => {
    mocks.role = role;
    render(<NavigationLinks />);
    expect(linkNames()).toEqual([role === "MERCHANT" ? "Merchant Overview" : "Overview", "Transfers", "Transactions", "Accounts", "Settings"]);
    expect(screen.getByRole("link", { name: role === "MERCHANT" ? "Merchant Overview" : "Overview" })).toHaveAttribute("aria-current", "page");
  });

  it.each(["OPERATOR", "ADMIN"])("shows only operational navigation for %s", role => {
    mocks.role = role;
    mocks.pathname = "/controls";
    render(<NavigationLinks />);
    expect(linkNames()).toEqual(["Operations", "Customers", "Transactions", "Ledger", "Controls", "Settlements", "Settings"]);
    expect(screen.getByRole("link", { name: "Controls" })).toHaveAttribute("aria-current", "page");
  });

  it("fails closed to Settings for an unknown role", () => {
    mocks.role = "AUDITOR";
    render(<NavigationLinks />);
    expect(linkNames()).toEqual(["Settings"]);
  });
});

function linkNames() {
  return screen.getAllByRole("link").map(link => link.textContent);
}
