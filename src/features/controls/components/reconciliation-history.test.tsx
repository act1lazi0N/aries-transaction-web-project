import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReconciliationHistory } from "@/features/controls/components/reconciliation-history";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/features/controls/queries", () => ({ useReconciliationRuns: () => ({ isPending: false, isError: false, data: { content: [{ id: "run-1", currency: "VND", windowStart: "2026-08-01T00:00:00Z", windowEnd: "2026-08-02T00:00:00Z", status: "COMPLETED", sourceCount: 10, reportingCount: 10, exceptionCount: 0, createdAt: "2026-08-02T00:00:00Z", completedAt: "2026-08-02T00:01:00Z" }] } }) }));

describe("ReconciliationHistory", () => {
  it("renders backend-confirmed collection results", () => {
    render(<ReconciliationHistory />);
    expect(screen.getByRole("heading", { name: "Recent reconciliation runs" })).toBeInTheDocument();
    expect(screen.getByText("run-1")).toBeInTheDocument();
    expect(screen.getByText("10 core / 10 reporting")).toBeInTheDocument();
  });
});
