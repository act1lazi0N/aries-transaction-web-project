"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors";
import { apiRequest } from "@/lib/api/client";
import { login, logout, refreshSession, register } from "@/features/auth/api";
import type { AuthResponse, AuthStatus, AuthUser, LoginCredentials, RegistrationDetails } from "@/features/auth/types";
import { mayRefreshAfterUnauthorized } from "@/features/auth/policy";
import { advanceAuthEpoch, canReuseRefreshPromise, isCurrentAuthEpoch } from "@/features/auth/session-epoch";
import type { AuthRequestOptions } from "@/features/auth/request-types";
import { connectSessionEvents } from "@/features/auth/session-events";

export type SessionNotice = { tone: "success" | "warning"; message: string };
type AuthSessionValue = {
  status: AuthStatus;
  user: AuthUser | null;
  error: ApiError | null;
  notice: SessionNotice | null;
  endSecuritySession: (notice: SessionNotice, broadcast?: boolean) => void;
  checkSession: () => Promise<"active" | "ended" | "unknown">;
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
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<SessionNotice | null>(null);
  const tokenRef = useRef<string | null>(null);
  const events = useRef<ReturnType<typeof connectSessionEvents> | null>(null);
  const authEpoch = useRef(0);
  const refreshInFlight = useRef<{ epoch: number; promise: Promise<string> } | null>(null);

  const clearLocalSession = useCallback((nextNotice: SessionNotice | null, clearCache = true) => {
    advanceAuthEpoch(authEpoch);
    refreshInFlight.current = null;
    tokenRef.current = null;
    setUser(null);
    setStatus("unauthenticated");
    setError(null);
    setNotice(nextNotice);
    if (clearCache) {
      void queryClient.cancelQueries();
      queryClient.clear();
    }
  }, [queryClient]);

  const invalidateSession = useCallback((cause: unknown) => {
    const normalized = authError(cause);
    const wasAuthenticated = tokenRef.current !== null;
    clearLocalSession(wasAuthenticated ? { tone: "warning", message: "Your session has ended. Sign in again to continue." } : null, wasAuthenticated);
    setError(normalized);
    return normalized;
  }, [clearLocalSession]);

  const endSecuritySession = useCallback((nextNotice: SessionNotice, broadcast = true) => {
    clearLocalSession(nextNotice);
    if (broadcast) events.current?.publish();
  }, [clearLocalSession]);

  const establishSession = useCallback(async (response: AuthResponse, expectedEpoch: number) => {
    if (!isCurrentAuthEpoch(authEpoch, expectedEpoch)) throw new ApiError("The authentication session changed", { kind: "unauthorized" });
    tokenRef.current = response.accessToken;
    setUser(response.user);
    setStatus("authenticated");
    setError(null);
    setNotice(null);
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

  const checkSession = useCallback(async (): Promise<"active" | "ended" | "unknown"> => {
    const token = tokenRef.current;
    if (!token) return "ended";
    const epoch = authEpoch.current;
    try {
      await apiRequest<unknown>("/api/v1/auth/me", { accessToken: token, cache: "no-store" });
      return isCurrentAuthEpoch(authEpoch, epoch) ? "active" : "unknown";
    } catch (cause) {
      if (!isCurrentAuthEpoch(authEpoch, epoch)) return "unknown";
      if (cause instanceof ApiError && cause.status === 401) {
        clearLocalSession({ tone: "warning", message: "This session has ended. Sign in again. The result of any unconfirmed security request remains unknown." });
        return "ended";
      }
      return "unknown";
    }
  }, [clearLocalSession]);

  useEffect(() => {
    const connection = connectSessionEvents(() => {
      if (!tokenRef.current && refreshInFlight.current) {
        clearLocalSession({ tone: "warning", message: "Your session changed in another tab. Sign in again to continue." });
      } else {
        const epoch = authEpoch.current;
        void checkSession().then(result => {
          if (result === "unknown" && isCurrentAuthEpoch(authEpoch, epoch)) {
            clearLocalSession({ tone: "warning", message: "Sign-in access changed in another tab and could not be checked. Your local session has been cleared. Sign in again to continue." });
          }
        });
      }
    });
    events.current = connection;
    const onFocus = () => { if (tokenRef.current) void checkSession(); };
    window.addEventListener("focus", onFocus);
    return () => { connection.close(); events.current = null; window.removeEventListener("focus", onFocus); };
  }, [checkSession, clearLocalSession]);

  const signIn = useCallback(async (credentials: LoginCredentials) => {
    const epoch = advanceAuthEpoch(authEpoch);
    refreshInFlight.current = null;
    tokenRef.current = null;
    void queryClient.cancelQueries(); queryClient.clear();
    setStatus("loading"); setError(null);
    try { await establishSession(await login(credentials), epoch); }
    catch (cause) { const normalized = authError(cause); if (!isCurrentAuthEpoch(authEpoch, epoch)) throw normalized; tokenRef.current = null; setUser(null); setStatus("error"); setError(normalized); throw normalized; }
  }, [establishSession, queryClient]);

  const signUp = useCallback(async (details: RegistrationDetails) => {
    const epoch = advanceAuthEpoch(authEpoch);
    refreshInFlight.current = null;
    tokenRef.current = null;
    void queryClient.cancelQueries(); queryClient.clear();
    setStatus("loading"); setError(null);
    try { await establishSession(await register(details), epoch); }
    catch (cause) { const normalized = authError(cause); if (!isCurrentAuthEpoch(authEpoch, epoch)) throw normalized; tokenRef.current = null; setUser(null); setStatus("error"); setError(normalized); throw normalized; }
  }, [establishSession, queryClient]);

  const signOut = useCallback(async () => {
    const currentToken = tokenRef.current;
    clearLocalSession(null);
    if (currentToken) {
      try { await logout(currentToken); } finally { events.current?.publish(); }
    }
  }, [clearLocalSession]);

  const request = useCallback(async <T,>(path: string, options: AuthRequestOptions = {}) => {
    if (!tokenRef.current) throw new ApiError("Sign in to continue", { kind: "unauthorized", code: "SESSION_CHANGED" });
    const epoch = authEpoch.current;
    const assertCurrent = () => {
      if (!isCurrentAuthEpoch(authEpoch, epoch)) throw new ApiError("The authentication session changed", { kind: "unauthorized", code: "SESSION_CHANGED" });
    };
    const { financialMutation = false, refreshOnUnauthorized = true, ...requestOptions } = options;
    const method = (requestOptions.method ?? "GET").toUpperCase();
    try {
      const result = await apiRequest<T>(path, { ...requestOptions, accessToken: tokenRef.current ?? undefined });
      assertCurrent();
      return result;
    } catch (cause) {
      assertCurrent();
      const normalized = authError(cause);
      const safeRead = refreshOnUnauthorized && mayRefreshAfterUnauthorized(method, financialMutation) && normalized.kind === "unauthorized";
      if (!safeRead) {
        if (normalized.kind === "unauthorized") invalidateSession(normalized);
        throw normalized;
      }
      let renewedToken: string;
      try {
        renewedToken = await refresh();
      } catch (refreshCause) {
        assertCurrent();
        throw invalidateSession(refreshCause);
      }
      try {
        assertCurrent();
        const result = await apiRequest<T>(path, { ...requestOptions, accessToken: renewedToken });
        assertCurrent();
        return result;
      } catch (retryCause) {
        assertCurrent();
        const retryError = authError(retryCause);
        if (retryError.kind === "unauthorized") invalidateSession(retryError);
        throw retryError;
      }
    }
  }, [invalidateSession, refresh]);

  const value = useMemo<AuthSessionValue>(() => ({ status, user, error, notice, endSecuritySession, checkSession, signIn, signUp, signOut, request }), [status, user, error, notice, endSecuritySession, checkSession, signIn, signUp, signOut, request]);
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const value = useContext(AuthSessionContext);
  if (!value) throw new Error("useAuthSession must be used inside AuthSessionProvider");
  return value;
}
