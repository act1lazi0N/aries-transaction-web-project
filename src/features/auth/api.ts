import { apiRequest } from "@/lib/api/client";
import type { AuthResponse, AuthUser, LoginCredentials } from "@/features/auth/types";

export function login(credentials: LoginCredentials) {
  return apiRequest<AuthResponse>("/api/v1/auth/login", { method: "POST", body: JSON.stringify(credentials) });
}

export function refreshSession() {
  return apiRequest<AuthResponse>("/api/v1/auth/refresh", { method: "POST" });
}

export function getCurrentUser(accessToken: string) {
  return apiRequest<AuthUser>("/api/v1/auth/me", { accessToken });
}

export function logout(accessToken: string) {
  return apiRequest<null>("/api/v1/auth/logout", { method: "POST", accessToken });
}
