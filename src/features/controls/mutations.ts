"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { createReconciliationRun } from "@/features/controls/api";
import { reconciliationKeys } from "@/features/controls/queries";
import type { ReconciliationRequest } from "@/features/controls/types";

export function useCreateReconciliationRun() {
  const session = useAuthSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ReconciliationRequest) => createReconciliationRun(request, session.request),
    retry: false,
    onSuccess: (run) => {
      queryClient.setQueryData(reconciliationKeys.detail(run.id), run);
    },
  });
}
