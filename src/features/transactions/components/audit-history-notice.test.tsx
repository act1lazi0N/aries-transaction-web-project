import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuditHistoryUnavailable } from "@/features/transactions/components/audit-history-notice";

describe("AuditHistoryUnavailable", () => {
  it("does not imply audit events exist without a public contract", () => {
    render(<AuditHistoryUnavailable />);

    expect(screen.getByRole("heading", { name: "Audit history" })).toBeInTheDocument();
    expect(screen.getByText(/Audit events are not available/i)).toBeInTheDocument();
    expect(screen.getByText(/only the confirmed transaction fields/i)).toBeInTheDocument();
  });
});
