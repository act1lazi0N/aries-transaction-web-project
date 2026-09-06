import { describe, expect, it } from "vitest";
import {
  capabilityForPathname,
  defaultRouteForRole,
  hasCapability,
  isKnownWorkspacePath,
  requiresFirstFinancialAccount,
  type WorkspaceCapability,
} from "@/features/auth/capabilities";

const routeCapabilities: WorkspaceCapability[] = [
  "overview:view",
  "operations:view",
  "customers:manage",
  "transactions:view",
  "ledger:view",
  "transfers:create",
  "controls:operate",
  "settlements:operate",
  "settings:view",
  "accounts:create",
];

describe("workspace capabilities", () => {
  it.each([
    ["USER", ["overview:view", "transactions:view", "transfers:create", "settings:view", "accounts:create"]],
    ["MERCHANT", ["overview:view", "transactions:view", "transfers:create", "settings:view", "accounts:create"]],
    ["OPERATOR", ["operations:view", "customers:manage", "transactions:view", "ledger:view", "controls:operate", "settlements:operate", "settings:view"]],
    ["ADMIN", ["operations:view", "customers:manage", "transactions:view", "ledger:view", "controls:operate", "settlements:operate", "settings:view"]],
  ] as const)("maps %s to the approved route capabilities", (role, expected) => {
    expect(routeCapabilities.filter(capability => hasCapability(role, capability))).toEqual(expected);
  });

  it("keeps transaction actions aligned with the backend role contract", () => {
    expect(hasCapability("OPERATOR", "transactions:reverse")).toBe(true);
    expect(hasCapability("ADMIN", "transactions:reverse")).toBe(true);
    expect(hasCapability("MERCHANT", "transactions:reverse")).toBe(false);
    expect(hasCapability("OPERATOR", "transactions:refund")).toBe(true);
    expect(hasCapability("MERCHANT", "transactions:refund")).toBe(true);
    expect(hasCapability("ADMIN", "transactions:refund")).toBe(false);
  });

  it("fails closed for an unknown role except for profile settings", () => {
    expect(hasCapability("AUDITOR", "settings:view")).toBe(true);
    expect(hasCapability("AUDITOR", "transactions:view")).toBe(false);
    expect(defaultRouteForRole("AUDITOR")).toBe("/settings");
  });

  it("requires a first financial account only for customer roles", () => {
    expect(requiresFirstFinancialAccount("USER")).toBe(true);
    expect(requiresFirstFinancialAccount("merchant")).toBe(true);
    expect(requiresFirstFinancialAccount("OPERATOR")).toBe(false);
    expect(requiresFirstFinancialAccount("ADMIN")).toBe(false);
  });

  it.each([
    ["USER", "/overview"],
    ["MERCHANT", "/overview"],
    ["OPERATOR", "/operations"],
    ["ADMIN", "/operations"],
    [undefined, "/settings"],
  ] as const)("uses the safe landing for %s", (role, route) => {
    expect(defaultRouteForRole(role)).toBe(route);
  });

  it("resolves route capabilities without accepting lookalike paths", () => {
    expect(capabilityForPathname("/transactions/detail")).toBe("transactions:view");
    expect(capabilityForPathname("/accounts/new")).toBe("accounts:create");
    expect(capabilityForPathname("/transactional")).toBeNull();
    expect(isKnownWorkspacePath("/settings")).toBe(true);
    expect(isKnownWorkspacePath("/unknown")).toBe(false);
  });
});
