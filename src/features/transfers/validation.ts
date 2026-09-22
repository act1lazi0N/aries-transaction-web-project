import { ApiError, userFacingErrorMessage } from "@/lib/api/errors";
import type {
  TransferDraft,
  TransferField,
  TransferFieldErrors,
  TransferPreviewRequest,
} from "@/features/transfers/types";

const amountPattern = /^\d{1,16}(?:\.\d{1,2})?$/;
const knownFields = new Set<TransferField>(["sourceAccountId", "recipientAccountNumber", "toAccountId", "amount", "description"]);

export function validateTransferDraft(draft: TransferDraft, eligibleAccountIds: ReadonlySet<string>): TransferFieldErrors {
  return {
    ...validateTransferAccounts(draft, eligibleAccountIds),
    ...validateTransferDetails(draft),
  };
}

export function validateTransferAccounts(draft: TransferDraft, eligibleAccountIds: ReadonlySet<string>): TransferFieldErrors {
  const errors: TransferFieldErrors = {};
  if (!draft.sourceAccountId || !eligibleAccountIds.has(draft.sourceAccountId)) {
    errors.sourceAccountId = "Choose an active VND account available to you.";
  }
  if (draft.mode === "EXTERNAL") {
    if (!draft.recipientAccountNumber.trim()) errors.recipientAccountNumber = "Enter the recipient account number.";
  } else {
    if (!draft.toAccountId || !eligibleAccountIds.has(draft.toAccountId)) errors.toAccountId = "Choose an active VND destination account.";
    else if (draft.toAccountId === draft.sourceAccountId) errors.toAccountId = "Source and destination accounts must be different.";
  }
  return errors;
}

export function validateTransferDetails(draft: TransferDraft): TransferFieldErrors {
  const errors: TransferFieldErrors = {};
  const amount = draft.amount.trim();
  if (!amountPattern.test(amount) || !isMinimumAmount(amount)) {
    errors.amount = "Enter at least 1000 VND, with at most 16 integer digits and two decimal places.";
  }
  if (draft.description.length > 255) errors.description = "Description must be 255 characters or fewer.";
  return errors;
}
export function toTransferPreviewRequest(draft: TransferDraft): TransferPreviewRequest {
  const description = draft.description.trim() || undefined;
  const common = {
    sourceAccountId: draft.sourceAccountId.trim(),
    amount: draft.amount.trim(),
    currency: "VND" as const,
    description,
  };
  return draft.mode === "EXTERNAL"
    ? { ...common, mode: "EXTERNAL", recipientAccountNumber: draft.recipientAccountNumber.trim() }
    : { ...common, mode: "OWN_ACCOUNTS", toAccountId: draft.toAccountId.trim() };
}

export function transferFieldErrors(error: unknown): TransferFieldErrors {
  if (!(error instanceof ApiError)) return {};
  const errors: TransferFieldErrors = {};
  for (const [field, message] of Object.entries(error.errors ?? {})) {
    if (knownFields.has(field as TransferField)) errors[field as TransferField] = safeFieldMessage(field as TransferField, message);
  }
  if (error.code === "INVALID_TRANSFER_AMOUNT") errors.amount = "Enter at least 1000 VND, with at most 16 integer digits and two decimal places.";
  return errors;
}

export function previewErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "We could not create a transfer preview. Your draft is unchanged.";
  switch (error.code) {
    case "RECIPIENT_UNAVAILABLE": return "The recipient is unavailable. Check the account number or use a different recipient.";
    case "INVALID_TRANSFER_AMOUNT": return "The amount does not meet the transfer rules. Check it and create a new preview.";
    case "FORBIDDEN": return "You cannot use that source account for this transfer.";
    case "RATE_LIMITED": return error.retryAfterSeconds === null
      ? "Too many preview requests were made. Wait before trying again."
      : `Too many preview requests were made. Try again in ${error.retryAfterSeconds} seconds.`;
    default: return userFacingErrorMessage(error, "We could not create a transfer preview. Your draft is unchanged.");
  }
}

export type ExecuteErrorDecision =
  | { kind: "expired"; message: string }
  | { kind: "unknown"; requestId?: string; code?: string }
  | { kind: "rejected"; message: string; requestId?: string; code?: string; blocked: boolean };

export function executeErrorDecision(error: unknown): ExecuteErrorDecision {
  if (!(error instanceof ApiError)) return { kind: "unknown" };
  const requestId = error.requestId ?? undefined;
  const code = error.code ?? undefined;
  if (error.code === "TRANSFER_PREVIEW_UNAVAILABLE") {
    return { kind: "expired", message: "This preview is no longer available. Create a new preview before sending." };
  }
  if (error.kind === "network" || error.kind === "server" || error.code === "DUPLICATE_IN_FLIGHT") {
    return { kind: "unknown", requestId, code };
  }
  if (error.code === "IDEMPOTENCY_CONFLICT" || error.code === "DUPLICATE_CONFLICT") {
    return {
      kind: "rejected",
      message: "This request conflicts with another transfer attempt. Check transaction history or contact support before doing anything else.",
      requestId,
      code,
      blocked: true,
    };
  }
  return {
    kind: "rejected",
    message: rejectedExecuteMessage(error),
    requestId,
    code,
    blocked: false,
  };
}

function rejectedExecuteMessage(error: ApiError): string {
  switch (error.code) {
    case "INSUFFICIENT_BALANCE": return "The source account does not have enough available balance. No completed transfer was confirmed.";
    case "ACCOUNT_NOT_ACTIVE": return "An account is no longer active. Refresh your accounts and create a new preview.";
    case "CURRENCY_MISMATCH": return "The account currency no longer matches this VND transfer. Create a new preview with eligible accounts.";
    case "SELF_TRANSFER": return "Source and destination accounts must be different.";
    case "INVALID_TRANSFER_AMOUNT": return "The amount does not meet the transfer rules. Create a new preview with a valid amount.";
    case "FORBIDDEN": return "You do not have permission to send this transfer.";
    case "UNAUTHORIZED": return "Your sign-in session ended. Sign in again; this transfer was not replayed.";
    default: return "The service rejected this transfer. No completed transfer was confirmed; review the details before trying again.";
  }
}

function safeFieldMessage(field: TransferField, backendMessage: string): string {
  if (field === "amount") return "Enter at least 1000 VND, with at most 16 integer digits and two decimal places.";
  if (field === "recipientAccountNumber") return "Check the recipient account number.";
  if (field === "sourceAccountId") return "Choose an eligible source account.";
  if (field === "toAccountId") return "Choose an eligible destination account.";
  if (field === "description") return "Check the description and keep it within 255 characters.";
  return backendMessage;
}

function isMinimumAmount(value: string) {
  const [integer] = value.split(".");
  const normalizedInteger = integer.replace(/^0+(?=\d)/, "");
  return normalizedInteger.length > 4 || normalizedInteger.length === 4 && normalizedInteger >= "1000";
}
