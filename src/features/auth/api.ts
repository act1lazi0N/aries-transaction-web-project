import { apiRequest } from "@/lib/api/client";
import { parseAuthResponse, type AuthUser, type LoginCredentials, type RegistrationDetails } from "@/features/auth/types";

export const authPaths = {
  register: "/api/v1/auth/register",
  login: "/api/v1/auth/login",
} as const;

export function register(details: RegistrationDetails) {
  return apiRequest<unknown>(authPaths.register, { method: "POST", body: JSON.stringify(details) }).then(parseAuthResponse);
}

export function login(credentials: LoginCredentials) {
  return apiRequest<unknown>(authPaths.login, { method: "POST", body: JSON.stringify(credentials) }).then(parseAuthResponse);
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
