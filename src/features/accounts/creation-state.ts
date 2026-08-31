import type { Account, CreatableAccountType, CreateAccountRequest } from "@/features/accounts/types";

export type AccountCreationDraft = {
  accountType: CreatableAccountType | "";
  currency: "VND";
  description: string;
};

export type AccountCreationFieldErrors = Partial<Record<"accountType" | "description", string>>;

export type AccountCreationAttempt = {
  version: 1;
  userId: string;
  request: CreateAccountRequest;
  knownAccountIds: string[];
  createdAt: string;
};

export type AccountCreationState =
  | { tag: "restoring"; draft: AccountCreationDraft }
  | { tag: "editing"; draft: AccountCreationDraft; fieldErrors: AccountCreationFieldErrors; formError?: string }
  | { tag: "review"; draft: AccountCreationDraft }
  | { tag: "submitting"; draft: AccountCreationDraft; attempt: AccountCreationAttempt }
  | { tag: "unknown"; draft: AccountCreationDraft; attempt: AccountCreationAttempt; message: string; requestId?: string }
  | { tag: "rejected"; draft: AccountCreationDraft; message: string; requestId?: string; code?: string; blocked: boolean }
  | { tag: "result"; draft: AccountCreationDraft; account: Account };

export type AccountCreationAction =
  | { type: "restore_finished"; attempt: AccountCreationAttempt | null }
  | { type: "draft_updated"; draft: AccountCreationDraft }
  | { type: "validation_failed"; fieldErrors: AccountCreationFieldErrors; formError: string }
  | { type: "review_started" }
  | { type: "edit" }
  | { type: "submit_started"; attempt: AccountCreationAttempt }
  | { type: "server_validation_failed"; fieldErrors: AccountCreationFieldErrors; formError: string }
  | { type: "submit_unknown"; message: string; requestId?: string }
  | { type: "recovery_checked"; message: string }
  | { type: "submit_rejected"; message: string; requestId?: string; code?: string; blocked: boolean }
  | { type: "submit_succeeded"; account: Account }
  | { type: "attempt_restored"; attempt: AccountCreationAttempt }
  | { type: "start_over" };

export function createAccountCreationDraft(): AccountCreationDraft {
  return { accountType: "", currency: "VND", description: "" };
}

export function createInitialAccountCreationState(): AccountCreationState {
  return { tag: "restoring", draft: createAccountCreationDraft() };
}

export function accountCreationReducer(state: AccountCreationState, action: AccountCreationAction): AccountCreationState {
  switch (action.type) {
    case "restore_finished":
      if (action.attempt) {
        return {
          tag: "unknown",
          draft: {
            accountType: action.attempt.request.accountType,
            currency: "VND",
            description: action.attempt.request.description ?? "",
          },
          attempt: action.attempt,
          message: "A previous account request still needs an authoritative status check.",
        };
      }
      return { tag: "editing", draft: createAccountCreationDraft(), fieldErrors: {} };
    case "draft_updated":
      if (state.tag !== "editing") return state;
      return { tag: "editing", draft: action.draft, fieldErrors: {} };
    case "validation_failed":
      if (state.tag !== "editing") return state;
      return { ...state, fieldErrors: action.fieldErrors, formError: action.formError };
    case "review_started":
      if (state.tag !== "editing") return state;
      return { tag: "review", draft: state.draft };
    case "edit":
      return { tag: "editing", draft: state.draft, fieldErrors: {} };
    case "submit_started":
      if (state.tag !== "review" && state.tag !== "unknown") return state;
      return { tag: "submitting", draft: state.draft, attempt: action.attempt };
    case "server_validation_failed":
      if (state.tag !== "submitting") return state;
      return { tag: "editing", draft: state.draft, fieldErrors: action.fieldErrors, formError: action.formError };
    case "submit_unknown":
      if (state.tag !== "submitting") return state;
      return { tag: "unknown", draft: state.draft, attempt: state.attempt, message: action.message, requestId: action.requestId };
    case "recovery_checked":
      if (state.tag !== "unknown") return state;
      return { ...state, message: action.message };
    case "submit_rejected":
      return { tag: "rejected", draft: state.draft, message: action.message, requestId: action.requestId, code: action.code, blocked: action.blocked };
    case "submit_succeeded":
      if (state.tag !== "submitting" && state.tag !== "unknown") return state;
      return { tag: "result", draft: state.draft, account: action.account };
    case "attempt_restored":
      return accountCreationReducer(state, { type: "restore_finished", attempt: action.attempt });
    case "start_over":
      return { tag: "editing", draft: createAccountCreationDraft(), fieldErrors: {} };
  }
}

export function validateAccountCreationDraft(draft: AccountCreationDraft): AccountCreationFieldErrors {
  const errors: AccountCreationFieldErrors = {};
  if (draft.accountType !== "PERSONAL" && draft.accountType !== "BUSINESS") errors.accountType = "Choose Personal or Business.";
  if (draft.description.trim().length > 255) errors.description = "Description must be 255 characters or fewer.";
  return errors;
}

export function canonicalAccountRequest(draft: AccountCreationDraft, idempotencyKey: string): CreateAccountRequest {
  if (draft.accountType !== "PERSONAL" && draft.accountType !== "BUSINESS") throw new Error("A valid account type is required");
  const description = draft.description.trim();
  return { accountType: draft.accountType, currency: "VND", description: description || null, idempotencyKey };
}

export function matchesRecoveredAccount(account: Account, attempt: AccountCreationAttempt): boolean {
  return !attempt.knownAccountIds.includes(account.id)
    && account.accountType === attempt.request.accountType
    && account.currency === attempt.request.currency
    && (account.description ?? null) === attempt.request.description;
}
