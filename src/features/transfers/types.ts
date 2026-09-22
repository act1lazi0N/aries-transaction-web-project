import type { Transaction } from "@/features/transactions/types";

export type TransferMode = "EXTERNAL" | "OWN_ACCOUNTS";
export type TransferRouteMode = "external" | "own-accounts";

type CommonTransferDraft = {
  sourceAccountId: string;
  amount: string;
  currency: "VND";
  description: string;
};

export type ExternalTransferDraft = CommonTransferDraft & {
  mode: "EXTERNAL";
  recipientAccountNumber: string;
};

export type OwnAccountsTransferDraft = CommonTransferDraft & {
  mode: "OWN_ACCOUNTS";
  toAccountId: string;
};

export type TransferDraft = ExternalTransferDraft | OwnAccountsTransferDraft;

export type ExternalTransferPreviewRequest = {
  mode: "EXTERNAL";
  sourceAccountId: string;
  recipientAccountNumber: string;
  amount: string;
  currency: "VND";
  description?: string;
  toAccountId?: never;
};

export type OwnAccountsTransferPreviewRequest = {
  mode: "OWN_ACCOUNTS";
  sourceAccountId: string;
  toAccountId: string;
  amount: string;
  currency: "VND";
  description?: string;
  recipientAccountNumber?: never;
};

export type TransferPreviewRequest = ExternalTransferPreviewRequest | OwnAccountsTransferPreviewRequest;

export type TransferExecuteRequest = {
  previewId: string;
  idempotencyKey: string;
};

export type MaskedTransferAccount = {
  accountNumberMasked: string;
  displayName: string;
};

export type TransferPreview = {
  previewId: string;
  expiresAt: string;
  source: MaskedTransferAccount;
  recipient: MaskedTransferAccount;
  amount: string;
  fee: string;
  debitTotal: string;
  currency: "VND";
  warnings: string[];
};

export type TransferField = "sourceAccountId" | "recipientAccountNumber" | "toAccountId" | "amount" | "description";
export type TransferFieldErrors = Partial<Record<TransferField, string>>;

export type TransferWorkflowState =
  | { tag: "editing"; draft: TransferDraft; fieldErrors: TransferFieldErrors; formError?: string; retryAt?: number }
  | { tag: "previewing"; draft: TransferDraft }
  | { tag: "review"; draft: TransferDraft; preview: TransferPreview; idempotencyKey: string }
  | { tag: "executing"; draft: TransferDraft; preview: TransferPreview; idempotencyKey: string }
  | { tag: "expired"; draft: TransferDraft; message: string }
  | { tag: "unknown"; draft: TransferDraft; preview: TransferPreview; idempotencyKey: string; requestId?: string; code?: string }
  | { tag: "result"; draft: TransferDraft; transaction: Transaction }
  | { tag: "rejected"; draft: TransferDraft; message: string; requestId?: string; code?: string; blocked: boolean };
