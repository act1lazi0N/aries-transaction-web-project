import { describe, expect, it } from "vitest";
import { authenticatedLandingRoute } from "@/features/auth/routes";

describe("authenticated routes", () => {
  it("opens the protected overview after authentication", () => {
    expect(authenticatedLandingRoute).toBe("/overview");
  });
});
