import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import { parseTransaction } from "@/features/transactions/api";
import { transactionKeys } from "@/features/transactions/queries";
import type { Transaction } from "@/features/transactions/types";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";

export function reverseTransaction(transactionId: string, idempotencyKey: string, description: string | undefined, accessToken?: string) {
  return apiRequest<unknown>(`/api/v1/transfers/${encodeURIComponent(transactionId)}/reverse`, {
    method: "POST", accessToken, body: JSON.stringify({ idempotencyKey, description }),
  }).then(parseTransaction);
}

export function useReverseTransaction() {
  const queryClient = useQueryClient();
  const session = useAuthSession();
  return useMutation({
    mutationFn: ({ transactionId, idempotencyKey, description }: { transactionId: string; idempotencyKey: string; description?: string }) => session.request<unknown>(`/api/v1/transfers/${encodeURIComponent(transactionId)}/reverse`, { method: "POST", body: JSON.stringify({ idempotencyKey, description }), financialMutation: true }).then(parseTransaction),
    retry: false,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionKeys.detail(variables.transactionId) }),
      ]);
    },
  });
}

export function useRefundTransaction() {
  const queryClient = useQueryClient();
  const session = useAuthSession();
  return useMutation({
    mutationFn: ({ transactionId, idempotencyKey, amount, description }: { transactionId: string; idempotencyKey: string; amount: string; description?: string }) => session.request<unknown>(`/api/v1/transfers/${encodeURIComponent(transactionId)}/refund`, {
      method: "POST",
      body: JSON.stringify({ idempotencyKey, amount, description }),
      financialMutation: true,
    }).then(parseTransaction),
    retry: false,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionKeys.detail(variables.transactionId) }),
      ]);
    },
  });
}
