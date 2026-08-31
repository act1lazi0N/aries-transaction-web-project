import type { Transaction } from "@/features/transactions/types";
import type {
  TransferDraft,
  TransferFieldErrors,
  TransferMode,
  TransferPreview,
  TransferRouteMode,
  TransferWorkflowState,
} from "@/features/transfers/types";

export type TransferWorkflowAction =
  | { type: "route_changed"; mode: TransferRouteMode; sourceAccountId: string }
  | { type: "draft_updated"; draft: TransferDraft }
  | { type: "validation_failed"; fieldErrors: TransferFieldErrors; formError: string }
  | { type: "preview_started" }
  | { type: "preview_failed"; fieldErrors?: TransferFieldErrors; formError: string; retryAt?: number }
  | { type: "preview_succeeded"; preview: TransferPreview; idempotencyKey: string }
  | { type: "edit" }
  | { type: "preview_expired"; message: string }
  | { type: "execute_started" }
  | { type: "execute_unknown"; requestId?: string; code?: string }
  | { type: "execute_rejected"; message: string; requestId?: string; code?: string; blocked: boolean }
  | { type: "execute_succeeded"; transaction: Transaction }
  | { type: "start_over" };

export function routeModeToTransferMode(mode: TransferRouteMode): TransferMode {
  return mode === "own-accounts" ? "OWN_ACCOUNTS" : "EXTERNAL";
}

export function createTransferDraft(mode: TransferRouteMode, sourceAccountId = ""): TransferDraft {
  const common = { sourceAccountId, amount: "", currency: "VND" as const, description: "" };
  return mode === "own-accounts"
    ? { ...common, mode: "OWN_ACCOUNTS", toAccountId: "" }
    : { ...common, mode: "EXTERNAL", recipientAccountNumber: "" };
}

export function createInitialTransferState(mode: TransferRouteMode, sourceAccountId = ""): TransferWorkflowState {
  return { tag: "editing", draft: createTransferDraft(mode, sourceAccountId), fieldErrors: {} };
}

export function changeTransferDraftMode(draft: TransferDraft, mode: TransferRouteMode): TransferDraft {
  const common = {
    sourceAccountId: draft.sourceAccountId,
    amount: draft.amount,
    currency: "VND" as const,
    description: draft.description,
  };
  return mode === "own-accounts"
    ? { ...common, mode: "OWN_ACCOUNTS", toAccountId: "" }
    : { ...common, mode: "EXTERNAL", recipientAccountNumber: "" };
}

export function transferWorkflowReducer(state: TransferWorkflowState, action: TransferWorkflowAction): TransferWorkflowState {
  switch (action.type) {
    case "route_changed": {
      const expectedMode = routeModeToTransferMode(action.mode);
      if (state.draft.mode === expectedMode && state.draft.sourceAccountId === action.sourceAccountId) return state;
      const draft = state.draft.mode === expectedMode ? state.draft : changeTransferDraftMode(state.draft, action.mode);
      return { tag: "editing", draft: { ...draft, sourceAccountId: action.sourceAccountId }, fieldErrors: {} };
    }
    case "draft_updated":
      if (state.tag !== "editing") return state;
      return { tag: "editing", draft: action.draft, fieldErrors: {}, retryAt: state.retryAt };
    case "validation_failed":
      if (state.tag !== "editing") return state;
      return { ...state, fieldErrors: action.fieldErrors, formError: action.formError };
    case "preview_started":
      if (state.tag !== "editing" && state.tag !== "expired") return state;
      return { tag: "previewing", draft: state.draft };
    case "preview_failed":
      if (state.tag !== "previewing") return state;
      return {
        tag: "editing",
        draft: state.draft,
        fieldErrors: action.fieldErrors ?? {},
        formError: action.formError,
        retryAt: action.retryAt,
      };
    case "preview_succeeded":
      if (state.tag !== "previewing") return state;
      return { tag: "review", draft: state.draft, preview: action.preview, idempotencyKey: action.idempotencyKey };
    case "edit":
      return { tag: "editing", draft: state.draft, fieldErrors: {} };
    case "preview_expired":
      if (state.tag !== "review" && state.tag !== "executing") return state;
      return { tag: "expired", draft: state.draft, message: action.message };
    case "execute_started":
      if (state.tag !== "review" && state.tag !== "unknown") return state;
      return { tag: "executing", draft: state.draft, preview: state.preview, idempotencyKey: state.idempotencyKey };
    case "execute_unknown":
      if (state.tag !== "executing") return state;
      return {
        tag: "unknown",
        draft: state.draft,
        preview: state.preview,
        idempotencyKey: state.idempotencyKey,
        requestId: action.requestId,
        code: action.code,
      };
    case "execute_rejected":
      return {
        tag: "rejected",
        draft: state.draft,
        message: action.message,
        requestId: action.requestId,
        code: action.code,
        blocked: action.blocked,
      };
    case "execute_succeeded":
      if (state.tag !== "executing") return state;
      return { tag: "result", draft: state.draft, transaction: action.transaction };
    case "start_over":
      return {
        tag: "editing",
        draft: createTransferDraft(state.draft.mode === "OWN_ACCOUNTS" ? "own-accounts" : "external", state.draft.sourceAccountId),
        fieldErrors: {},
      };
  }
}
