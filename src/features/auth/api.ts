import { apiRequest } from "@/lib/api/client";
import { parseAuthResponse, type AuthUser, type LoginCredentials } from "@/features/auth/types";

export function login(credentials: LoginCredentials) {
  return apiRequest<unknown>("/api/v1/auth/login", { method: "POST", body: JSON.stringify(credentials) }).then(parseAuthResponse);
}

export function refreshSession() {
  return apiRequest<unknown>("/api/v1/auth/refresh", { method: "POST" }).then(parseAuthResponse);
}

export function getCurrentUser(accessToken: string) {
  return apiRequest<AuthUser>("/api/v1/auth/me", { accessToken });
}

export function logout(accessToken: string) {
  return apiRequest<null>("/api/v1/auth/logout", { method: "POST", accessToken });
}
