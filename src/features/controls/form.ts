import type { ReconciliationRequest } from "@/features/controls/types";

export type ReconciliationDraft = {
  currency: string;
  windowStart: string;
  windowEnd: string;
};

export type ReconciliationDraftErrors = Partial<Record<keyof ReconciliationDraft, string>>;

export const initialReconciliationDraft: ReconciliationDraft = {
  currency: "VND",
  windowStart: "",
  windowEnd: "",
};

export function validateReconciliationDraft(draft: ReconciliationDraft): ReconciliationDraftErrors {
  const errors: ReconciliationDraftErrors = {};
  const currency = draft.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) errors.currency = "Enter a three-letter currency code.";
  const start = toUtcIso(draft.windowStart);
  if (!start) errors.windowStart = "Enter a valid start time.";
  const end = toUtcIso(draft.windowEnd);
  if (!end) errors.windowEnd = "Enter a valid end time.";
  if (start && end && start >= end) errors.windowEnd = "End time must be after start time.";
  return errors;
}

export function toReconciliationRequest(draft: ReconciliationDraft): ReconciliationRequest {
  const start = toUtcIso(draft.windowStart);
  const end = toUtcIso(draft.windowEnd);
  if (!start || !end) throw new Error("A valid reconciliation window is required");
  return { currency: draft.currency.trim().toUpperCase(), windowStart: start, windowEnd: end };
}

export function toUtcIso(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
