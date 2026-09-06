import { describe, expect, it } from "vitest";
import { authRouteWithReturnTo, authenticatedLandingRoute, loginRouteFor, resolveAuthenticatedRoute, resolveAuthorizedRouteForRole } from "@/features/auth/routes";

describe("authenticated routes", () => {
  it("opens the protected overview after authentication", () => {
    expect(authenticatedLandingRoute).toBe("/overview");
  });

  it("preserves an internal protected route including its query and hash", () => {
    expect(resolveAuthenticatedRoute("/transactions?page=2#latest")).toBe("/transactions?page=2#latest");
  });

  it("preserves the settlement workspace and its selected batch", () => {
    expect(resolveAuthenticatedRoute("/settlements?batchId=batch-1#detail")).toBe("/settlements?batchId=batch-1#detail");
    expect(loginRouteFor("/settlements?batchId=batch-1")).toBe("/login?returnTo=%2Fsettlements%3FbatchId%3Dbatch-1");
  });

  it("preserves the protected account creation route", () => {
    expect(resolveAuthenticatedRoute("/accounts/new")).toBe("/accounts/new");
  });

  it.each([undefined, "", "/", "/login", "/register?returnTo=/controls", "/api/v1/auth/me", "/unknown", "https://example.com", "//example.com", "javascript:alert(1)"])(
    "falls back to overview for unsafe or public destination %s",
    (destination) => {
      expect(resolveAuthenticatedRoute(destination)).toBe("/overview");
    },
  );

  it("uses only the first returnTo value", () => {
    expect(resolveAuthenticatedRoute(["/controls?runId=abc", "https://example.com"])).toBe("/controls?runId=abc");
  });

  it("builds encoded auth routes", () => {
    expect(loginRouteFor("/transactions?page=2")).toBe("/login?returnTo=%2Ftransactions%3Fpage%3D2");
    expect(authRouteWithReturnTo("/register", "/settings")).toBe("/register?returnTo=%2Fsettings");
  });

  it("preserves only destinations available to the authenticated role", () => {
    expect(resolveAuthorizedRouteForRole("/transfers?mode=EXTERNAL#draft", "USER")).toBe("/transfers?mode=EXTERNAL#draft");
    expect(resolveAuthorizedRouteForRole("/controls?runId=run-1", "USER")).toBe("/overview");
    expect(resolveAuthorizedRouteForRole("/overview?accountId=account-1", "OPERATOR")).toBe("/operations");
    expect(resolveAuthorizedRouteForRole("/transactions?page=2#latest", "OPERATOR")).toBe("/transactions?page=2#latest");
  });

  it("uses Settings as the fail-closed destination for unknown roles", () => {
    expect(resolveAuthorizedRouteForRole("/settlements", "AUDITOR")).toBe("/settings");
    expect(resolveAuthorizedRouteForRole("javascript:alert(1)", "AUDITOR")).toBe("/settings");
  });
});
