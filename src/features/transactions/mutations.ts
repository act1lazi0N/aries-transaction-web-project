import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import type { Transaction } from "@/features/transactions/types";

type MutationResponse = Transaction;

export function reverseTransaction(transactionId: string, idempotencyKey: string, description: string | undefined, accessToken?: string) {
  return apiRequest<MutationResponse>(`/api/v1/transfers/${encodeURIComponent(transactionId)}/reverse`, {
    method: "POST", accessToken, body: JSON.stringify({ idempotencyKey, description }),
  });
}

export function useReverseTransaction(accessToken?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, idempotencyKey, description }: { transactionId: string; idempotencyKey: string; description?: string }) => reverseTransaction(transactionId, idempotencyKey, description, accessToken),
    retry: false,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["transactions"] }); },
  });
}
