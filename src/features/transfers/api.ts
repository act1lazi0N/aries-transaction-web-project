import { apiRequest } from "@/lib/api/client";
import { parseTransaction } from "@/features/transactions/api";
import type { Transaction } from "@/features/transactions/types";
import type { AuthRequest } from "@/features/auth/request-types";

export type TransferRequest = {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  currency: string;
  idempotencyKey: string;
  description?: string;
};

export function transferPath() { return "/api/v1/transfers"; }

export function createTransfer(request: TransferRequest, authRequest?: AuthRequest): Promise<Transaction> {
  const run = authRequest ?? (<T>(path: string, options?: RequestInit) => apiRequest<T>(path, options));
  return run<unknown>(transferPath(), { method: "POST", body: JSON.stringify(request), financialMutation: true }).then(parseTransaction);
}
