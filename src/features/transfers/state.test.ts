import { describe, expect, it } from "vitest";
import { createInitialTransferState, transferWorkflowReducer } from "@/features/transfers/state";

const preview = {
  previewId: "preview-1", expiresAt: "2026-08-28T15:05:00+07:00",
  source: { accountNumberMasked: "******1111", displayName: "Source" }, recipient: { accountNumberMasked: "******2222", displayName: "Recipient" },
  amount: "1000.00", fee: "0", debitTotal: "1000.00", currency: "VND" as const, warnings: [],
};

describe("transfer workflow reducer", () => {
  it("preserves common draft fields while changing mode and invalidating preview context", () => {
    let state = createInitialTransferState("external", "source-1");
    if (state.tag !== "editing" || state.draft.mode !== "EXTERNAL") throw new Error("expected external draft");
    state = transferWorkflowReducer(state, { type: "draft_updated", draft: { ...state.draft, amount: "1200.00", description: "Rent", recipientAccountNumber: "001122" } });
    state = transferWorkflowReducer(state, { type: "route_changed", mode: "own-accounts", sourceAccountId: "source-1" });

    expect(state.tag).toBe("editing");
    expect(state.draft).toEqual({ mode: "OWN_ACCOUNTS", sourceAccountId: "source-1", toAccountId: "", amount: "1200.00", currency: "VND", description: "Rent" });
  });

  it("keeps the same preview and idempotency key through an unknown retry", () => {
    let state = createInitialTransferState("external", "source-1");
    state = transferWorkflowReducer(state, { type: "preview_started" });
    state = transferWorkflowReducer(state, { type: "preview_succeeded", preview, idempotencyKey: "stable-key-00000001" });
    state = transferWorkflowReducer(state, { type: "execute_started" });
    state = transferWorkflowReducer(state, { type: "execute_unknown", requestId: "request-1" });
    state = transferWorkflowReducer(state, { type: "execute_started" });

    expect(state).toMatchObject({ tag: "executing", preview: { previewId: "preview-1" }, idempotencyKey: "stable-key-00000001" });
  });

  it("discards preview data when the user edits", () => {
    let state = createInitialTransferState("external", "source-1");
    state = transferWorkflowReducer(state, { type: "preview_started" });
    state = transferWorkflowReducer(state, { type: "preview_succeeded", preview, idempotencyKey: "stable-key-00000001" });
    state = transferWorkflowReducer(state, { type: "edit" });

    expect(state.tag).toBe("editing");
    expect(state).not.toHaveProperty("preview");
    expect(state).not.toHaveProperty("idempotencyKey");
  });
});
