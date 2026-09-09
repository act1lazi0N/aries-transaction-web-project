import { describe, expect, it } from "vitest";
import { parseAuthResponse } from "@/features/auth/types";

const validResponse = { accessToken: "access-token", tokenType: "Bearer", expiresIn: 900, user: { id: "user-1", fullName: "Aries User", email: "user@example.com", role: "USER", isActive: true, emailVerified: false, createdAt: "2026-08-12T00:00:00Z" } };

describe("parseAuthResponse", () => {
  it("accepts the backend auth shape", () => { expect(parseAuthResponse(validResponse)).toEqual(validResponse); });
  it("rejects malformed auth data", () => {
    expect(() => parseAuthResponse({ ...validResponse, accessToken: "" })).toThrow("authentication response");
    expect(() => parseAuthResponse({ ...validResponse, user: { ...validResponse.user, role: 7 } })).toThrow("authentication user");
    expect(() => parseAuthResponse({ ...validResponse, user: { ...validResponse.user, emailVerified: undefined } })).toThrow("authentication user");
  });
});
