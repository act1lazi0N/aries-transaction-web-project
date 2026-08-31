"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, type ApiErrorKind } from "@/lib/api/errors";
import { apiRequest } from "@/lib/api/client";
import { login, logout, refreshSession, register } from "@/features/auth/api";
import type { AuthResponse, AuthStatus, AuthUser, LoginCredentials, RegistrationDetails } from "@/features/auth/types";
import { mayRefreshAfterUnauthorized } from "@/features/auth/policy";
import { advanceAuthEpoch, canReuseRefreshPromise, isCurrentAuthEpoch } from "@/features/auth/session-epoch";

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
  const authEpoch = useRef(0);
  const refreshInFlight = useRef<{ epoch: number; promise: Promise<string> } | null>(null);

  const invalidateSession = useCallback((cause: unknown) => {
    const normalized = authError(cause);
    advanceAuthEpoch(authEpoch);
    refreshInFlight.current = null;
    setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
    setError(normalized);
    return normalized;
  }, []);

  const establishSession = useCallback(async (response: AuthResponse, expectedEpoch: number) => {
    if (!isCurrentAuthEpoch(authEpoch, expectedEpoch)) throw new ApiError("The authentication session changed", { kind: "unauthorized" });
    setAccessToken(response.accessToken);
    setUser(response.user);
    setStatus("authenticated");
    setError(null);
    return response.accessToken;
  }, []);

  const refresh = useCallback(async () => {
    const epoch = authEpoch.current;
    const current = refreshInFlight.current;
    if (current && canReuseRefreshPromise(current.epoch, epoch)) return current.promise;
    let promise: Promise<string>;
    promise = refreshSession().then(response => establishSession(response, epoch)).finally(() => {
      if (refreshInFlight.current?.promise === promise) refreshInFlight.current = null;
    });
    refreshInFlight.current = { epoch, promise };
    return promise;
  }, [establishSession]);

  useEffect(() => {
    const epoch = authEpoch.current;
    void refresh().catch((cause: unknown) => {
      if (!isCurrentAuthEpoch(authEpoch, epoch)) return;
      invalidateSession(cause);
    });
  }, [invalidateSession, refresh]);

  const signIn = useCallback(async (credentials: LoginCredentials) => {
    const epoch = advanceAuthEpoch(authEpoch);
    refreshInFlight.current = null;
    setStatus("loading"); setError(null);
    try { await establishSession(await login(credentials), epoch); }
    catch (cause) { const normalized = authError(cause); if (!isCurrentAuthEpoch(authEpoch, epoch)) return; setAccessToken(null); setUser(null); setStatus("error"); setError(normalized); throw normalized; }
  }, [establishSession]);

  const signUp = useCallback(async (details: RegistrationDetails) => {
    const epoch = advanceAuthEpoch(authEpoch);
    refreshInFlight.current = null;
    setStatus("loading"); setError(null);
    try { await establishSession(await register(details), epoch); }
    catch (cause) { const normalized = authError(cause); if (!isCurrentAuthEpoch(authEpoch, epoch)) return; setAccessToken(null); setUser(null); setStatus("error"); setError(normalized); throw normalized; }
  }, [establishSession]);

  const signOut = useCallback(async () => {
    advanceAuthEpoch(authEpoch);
    refreshInFlight.current = null;
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
      if (!safeRead) {
        if (normalized.kind === "unauthorized") invalidateSession(normalized);
        throw normalized;
      }
      let renewedToken: string;
      try {
        renewedToken = await refresh();
      } catch (refreshCause) {
        throw invalidateSession(refreshCause);
      }
      try {
        return await apiRequest<T>(path, { ...requestOptions, accessToken: renewedToken });
      } catch (retryCause) {
        const retryError = authError(retryCause);
        if (retryError.kind === "unauthorized") invalidateSession(retryError);
        throw retryError;
      }
    }
  }, [accessToken, invalidateSession, refresh]);

  const value = useMemo<AuthSessionValue>(() => ({ status, user, error, signIn, signUp, signOut, request }), [status, user, error, signIn, signUp, signOut, request]);
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const value = useContext(AuthSessionContext);
  if (!value) throw new Error("useAuthSession must be used inside AuthSessionProvider");
  return value;
}
