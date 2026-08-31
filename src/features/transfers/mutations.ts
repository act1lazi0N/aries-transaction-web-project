"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { accountKeys } from "@/features/accounts/queries";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { transactionKeys } from "@/features/transactions/queries";
import { createTransferPreview, executeTransferPreview } from "@/features/transfers/api";
import type { TransferExecuteRequest, TransferPreviewRequest } from "@/features/transfers/types";

export function useCreateTransferPreview() {
  const session = useAuthSession();
  return useMutation({
    mutationFn: (request: TransferPreviewRequest) => createTransferPreview(request, session.request),
    retry: false,
  });
}
export function useExecuteTransferPreview() {
  const session = useAuthSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: TransferExecuteRequest) => executeTransferPreview(request, session.request),
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
      ]);
    },
  });
}
