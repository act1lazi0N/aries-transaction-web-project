import { afterEach, describe, expect, it, vi } from "vitest";
import { authPaths, logout, register } from "@/features/auth/api";

const authResponse = { accessToken: "access-token", tokenType: "Bearer", expiresIn: 900, user: { id: "user-1", fullName: "Aries User", email: "user@example.com", role: "USER", isActive: true, emailVerified: false, createdAt: "2026-08-13T00:00:00Z" } };

afterEach(() => vi.unstubAllGlobals());

describe("registration API", () => {
  it("uses the public backend registration endpoint with credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, message: "registered", data: authResponse }), { status: 201, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(register({ fullName: "Aries User", email: "user@example.com", password: "password-123" })).resolves.toEqual(authResponse);
    expect(authPaths.register).toBe("/api/v1/auth/register");
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/v1/auth/register", expect.objectContaining({ method: "POST", credentials: "include" }));
  });

  it("accepts a successful logout envelope without a data field", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, message: "Logged out" }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(logout("access-token")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/v1/auth/logout", expect.objectContaining({ method: "POST", credentials: "include" }));
  });
});
