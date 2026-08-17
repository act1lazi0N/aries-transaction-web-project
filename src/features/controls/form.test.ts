import { describe, expect, it } from "vitest";
import { toReconciliationRequest, validateReconciliationDraft } from "@/features/controls/form";

describe("reconciliation form", () => {
  it("normalizes currency and serializes the local window with an offset", () => {
    expect(toReconciliationRequest({ currency: " vnd ", windowStart: "2026-08-17T08:00", windowEnd: "2026-08-17T09:00" })).toMatchObject({ currency: "VND", windowStart: expect.stringMatching(/Z$/), windowEnd: expect.stringMatching(/Z$/) });
  });

  it("rejects malformed and reversed windows", () => {
    expect(validateReconciliationDraft({ currency: "VN", windowStart: "2026-08-17T09:00", windowEnd: "2026-08-17T08:00" })).toMatchObject({ currency: expect.any(String), windowEnd: expect.any(String) });
  });
});
