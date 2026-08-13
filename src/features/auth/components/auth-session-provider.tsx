"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, type ApiErrorKind } from "@/lib/api/errors";
import { apiRequest } from "@/lib/api/client";
import { getCurrentUser, login, logout, refreshSession, register } from "@/features/auth/api";
import type { AuthResponse, AuthStatus, AuthUser, LoginCredentials, RegistrationDetails } from "@/features/auth/types";
import { mayRefreshAfterUnauthorized } from "@/features/auth/policy";

type AuthRequestOptions = RequestInit & { financialMutation?: boolean };
type AuthSessionValue = {
  status: AuthStatus;
  user: AuthUser | null;
  error: ApiError | null;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (details: RegistrationDetails) => Promise<void>;
  signOut: () => Promise<void>;
  request: <T>(path: string, options?: AuthRequestOptions) => Promise<T>;
};

const AuthSessionContext = createContext<AuthSessionValue | null>(null);

function authError(error: unknown) {
  if (error instanceof ApiError) return error;
  return new ApiError(error instanceof Error ? error.message : "Authentication failed", { kind: "unknown" });
}

export function AuthSessionProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const refreshInFlight = useRef<Promise<string> | null>(null);

  const establishSession = useCallback(async (response: AuthResponse) => {
    setAccessToken(response.accessToken);
    const currentUser = await getCurrentUser(response.accessToken);
    setUser(currentUser);
    setStatus("authenticated");
    setError(null);
    return response.accessToken;
  }, []);

  const refresh = useCallback(async () => {
    if (!refreshInFlight.current) {
      refreshInFlight.current = refreshSession().then(establishSession).finally(() => { refreshInFlight.current = null; });
    }
    return refreshInFlight.current;
  }, [establishSession]);

  useEffect(() => {
    void refresh().catch((cause: unknown) => {
      setAccessToken(null); setUser(null); setStatus("unauthenticated"); setError(authError(cause));
    });
  }, [refresh]);

  const signIn = useCallback(async (credentials: LoginCredentials) => {
    setStatus("loading"); setError(null);
    try { await establishSession(await login(credentials)); }
    catch (cause) { const normalized = authError(cause); setAccessToken(null); setUser(null); setStatus("error"); setError(normalized); throw normalized; }
  }, [establishSession]);

  const signUp = useCallback(async (details: RegistrationDetails) => {
    setStatus("loading"); setError(null);
    try { await establishSession(await register(details)); }
    catch (cause) { const normalized = authError(cause); setAccessToken(null); setUser(null); setStatus("error"); setError(normalized); throw normalized; }
  }, [establishSession]);

  const signOut = useCallback(async () => {
    const currentToken = accessToken;
    setAccessToken(null); setUser(null); setStatus("unauthenticated"); setError(null);
    if (currentToken) await logout(currentToken);
  }, [accessToken]);

  const request = useCallback(async <T,>(path: string, options: AuthRequestOptions = {}) => {
    const { financialMutation = false, ...requestOptions } = options;
    const method = (requestOptions.method ?? "GET").toUpperCase();
    try {
      return await apiRequest<T>(path, { ...requestOptions, accessToken: accessToken ?? undefined });
    } catch (cause) {
      const normalized = authError(cause);
      const safeRead = mayRefreshAfterUnauthorized(method, financialMutation) && normalized.kind === "unauthorized";
      if (!safeRead) throw normalized;
      const renewedToken = await refresh();
      return apiRequest<T>(path, { ...requestOptions, accessToken: renewedToken });
    }
  }, [accessToken, refresh]);

  const value = useMemo<AuthSessionValue>(() => ({ status, user, error, signIn, signUp, signOut, request }), [status, user, error, signIn, signUp, signOut, request]);
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const value = useContext(AuthSessionContext);
  if (!value) throw new Error("useAuthSession must be used inside AuthSessionProvider");
  return value;
}
