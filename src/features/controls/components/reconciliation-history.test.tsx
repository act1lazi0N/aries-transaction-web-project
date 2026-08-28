import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReconciliationHistoryUnavailable } from "@/features/controls/components/reconciliation-history";

describe("ReconciliationHistoryUnavailable", () => {
  it("explains the missing run-list contract without reconstructing history", () => {
    render(<ReconciliationHistoryUnavailable />);

    expect(screen.getByRole("heading", { name: "Reconciliation history is not available yet" })).toBeInTheDocument();
    expect(screen.getByText(/does not expose a run-list endpoint/i)).toBeInTheDocument();
    expect(screen.getByText(/No history is inferred or reconstructed/i)).toBeInTheDocument();
  });
});
