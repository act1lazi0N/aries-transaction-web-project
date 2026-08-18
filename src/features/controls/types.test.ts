import { describe, expect, it } from "vitest";
import { toReconciliationLifecycle } from "@/features/controls/types";

describe("toReconciliationLifecycle", () => {
  it("keeps pending and completed states distinct", () => {
    expect(toReconciliationLifecycle("RUNNING")).toEqual({ kind: "running", label: "Running" });
    expect(toReconciliationLifecycle("COMPLETED")).toEqual({ kind: "completed", label: "Completed" });
  });

  it("does not infer a result for unknown backend statuses", () => {
    expect(toReconciliationLifecycle("NEW_STATUS")).toEqual({ kind: "unknown", label: "Status unavailable" });
  });
});
