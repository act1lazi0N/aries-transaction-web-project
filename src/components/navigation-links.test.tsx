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
    expect(linkNames()).toEqual(["Operations", "Email deliveries", "Customers", "Transactions", "Ledger", "Controls", "Settlements", "Settings"]);
    expect(screen.getByRole("link", { name: "Controls" })).toHaveAttribute("aria-current", "page");
  });

  it.each([
    ["/operations", "Operations"],
    ["/operations/notification-email-deliveries", "Email deliveries"],
    ["/operations/notification-email-deliveries/delivery-1", "Email deliveries"],
    ["/customers/customer-1", "Customers"],
  ])("selects only the most specific navigation item for %s", (pathname, label) => {
    mocks.role = "OPERATOR";
    mocks.pathname = pathname;
    render(<NavigationLinks />);
    expect(screen.getAllByRole("link", { current: "page" })).toEqual([
      screen.getByRole("link", { name: label }),
    ]);
  });

  it("keeps only Email deliveries selected when the sidebar is collapsed", () => {
    mocks.role = "ADMIN";
    mocks.pathname = "/operations/notification-email-deliveries";
    render(<NavigationLinks collapsed />);
    expect(screen.getAllByRole("link", { current: "page" })).toEqual([
      screen.getByRole("link", { name: "Email deliveries" }),
    ]);
  });

  it("does not select a route that only shares a partial path segment", () => {
    mocks.role = "OPERATOR";
    mocks.pathname = "/operations-other";
    render(<NavigationLinks />);
    expect(screen.queryAllByRole("link", { current: "page" })).toHaveLength(0);
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
