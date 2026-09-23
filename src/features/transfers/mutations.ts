"use client";
import { clearTransferRecovery, readTransferRecovery, saveTransferRecovery } from "./recovery";
import { ApiError } from "@/lib/api/errors";
import { executeErrorDecision } from "./validation";
import { qrKeys } from "@/features/qr/api";

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
    retry: false, networkMode: "always",
  });
}
export function useExecuteTransferPreview() {
  const session = useAuthSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: TransferExecuteRequest) => {
      if (!session.user) throw new Error("Sign in before sending");
      const recovering = readTransferRecovery(session.user.id) !== null;
      saveTransferRecovery(session.user.id, request);
      try {
        const transaction = await executeTransferPreview(request, session.request);
        clearTransferRecovery();
        return transaction;
      } catch (error) {
        // A rejection of a later replay does not prove the original request never committed.
        if (recovering) throw new ApiError("The original transfer outcome remains unconfirmed. Check history or contact support if replay is unavailable.", {
          kind: "unknown", code: "REPLAY_UNCONFIRMED",
          requestId: error instanceof ApiError ? error.requestId : null,
          retryAfterSeconds: error instanceof ApiError ? error.retryAfterSeconds : null,
        });
        throw error;
      }
    },
    onError: error => {
      const decision = executeErrorDecision(error);
      if (decision.kind !== "unknown" && !(decision.kind === "rejected" && decision.blocked)) clearTransferRecovery();
    },
    retry: false, networkMode: "always",
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountKeys.all }),
        queryClient.invalidateQueries({ queryKey: qrKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
      ]);
    },
  });
}
