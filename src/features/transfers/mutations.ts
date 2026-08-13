"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { transactionKeys } from "@/features/transactions/queries";
import { createTransfer, type TransferRequest } from "@/features/transfers/api";

export function useCreateTransfer() {
  const session = useAuthSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: TransferRequest) => createTransfer(request, session.request),
    retry: false,
    onSuccess: async (transaction) => {
      await queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      await queryClient.setQueryData(transactionKeys.detail(transaction.id), transaction);
    },
  });
}
