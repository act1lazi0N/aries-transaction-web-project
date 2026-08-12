import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import type { Transaction } from "@/features/transactions/types";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";

type MutationResponse = Transaction;

export function reverseTransaction(transactionId: string, idempotencyKey: string, description: string | undefined, accessToken?: string) {
  return apiRequest<MutationResponse>(`/api/v1/transfers/${encodeURIComponent(transactionId)}/reverse`, {
    method: "POST", accessToken, body: JSON.stringify({ idempotencyKey, description }),
  });
}

export function useReverseTransaction() {
  const queryClient = useQueryClient();
  const session = useAuthSession();
  return useMutation({
    mutationFn: ({ transactionId, idempotencyKey, description }: { transactionId: string; idempotencyKey: string; description?: string }) => session.request<MutationResponse>(`/api/v1/transfers/${encodeURIComponent(transactionId)}/reverse`, { method: "POST", body: JSON.stringify({ idempotencyKey, description }), financialMutation: true }),
    retry: false,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["transactions"] }); },
  });
}
