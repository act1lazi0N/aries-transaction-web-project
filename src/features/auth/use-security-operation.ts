"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { securityFailure, type SecurityFailure } from "@/features/auth/security-errors";

/** Pass no mutation variables: passwords/tokens must never enter MutationCache. */
export function useSecurityOperation<T>(execute: (input: T) => Promise<null>, onSuccess: () => void, onFailure?: (failure: SecurityFailure) => void) {
  const payload = useRef<{ input: T } | null>(null);
  const locked = useRef(false);
  const mutation = useMutation<null, SecurityFailure, void>({
    mutationFn: async () => {
      const current = payload.current;
      payload.current = null;
      if (!current) throw securityFailure(null);
      try { return await execute(current.input); } catch (cause) { throw securityFailure(cause); }
    },
    retry: false,
    // An offline submission must fail now, not execute later on reconnect.
    networkMode: "always",
    gcTime: 0,
    onSuccess,
    onError: failure => { if (failure.kind === "rejected") locked.current = false; onFailure?.(failure); },
  });
  useEffect(() => () => { payload.current = null; }, []);
  function submit(input: T) {
    if (locked.current) return;
    locked.current = true;
    payload.current = { input };
    mutation.mutate();
  }
  function restart() {
    if (!mutation.isSuccess) return;
    locked.current = false;
    mutation.reset();
  }
  return { ...mutation, submit, restart };
}

export function useCooldown() {
  const [until, setUntil] = useState(0);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!until) return;
    const update = () => setSeconds(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [until]);
  const start = useCallback((duration: number) => {
    setSeconds(duration);
    setUntil(Date.now() + duration * 1000);
  }, []);
  return { seconds, start };
}
