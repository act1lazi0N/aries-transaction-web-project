"use client";

import { useMutation } from "@tanstack/react-query";
import { createAccount } from "@/features/accounts/api";
import type { CreateAccountRequest } from "@/features/accounts/types";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";

export function useCreateAccount() {
  const session = useAuthSession();

  return useMutation({
    mutationFn: (request: CreateAccountRequest) => createAccount(request, session.request),
    retry: false,
  });
}
