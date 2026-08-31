import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TransactionPartyDisplay, TransactionRouteSummary } from "@/features/transactions/components/transaction-party-display";
import type { TransactionRead } from "@/features/transactions/types";

const transaction: TransactionRead = {
  id: "transaction-1", fromAccountId: "owned-uuid", toAccountId: "foreign-uuid", amount: "1000.00", currency: "VND", status: "COMPLETED", idempotencyKey: "key-1", description: null, failureReason: null, originalTransactionId: null, refundedAmount: null, createdAt: "2026-08-29T00:00:00Z", completedAt: "2026-08-29T00:00:01Z",
  fromParty: { accountNumberDisplay: "100000000001", exposure: "FULL_OWNED", displayName: "Primary account", ownedByRequester: true },
  toParty: { accountNumberDisplay: "******7788", exposure: "MASKED_COUNTERPARTY", displayName: "Verified recipient", ownedByRequester: false },
  direction: "OUTGOING",
};

afterEach(cleanup);

describe("transaction party display", () => {
  it("renders backend direction and masked counterparty without UUIDs or copy affordance", () => {
    render(<TransactionRouteSummary transaction={transaction} />);
    expect(screen.getByText("Outgoing")).toBeVisible();
    expect(screen.getByText("Verified recipient")).toBeVisible();
    expect(screen.getByText("******7788")).toBeVisible();
    expect(screen.queryByText("foreign-uuid")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Copy/ })).not.toBeInTheDocument();
  });

  it("allows copying only an owned full account number and renders unavailable honestly", () => {
    const { rerender } = render(<TransactionPartyDisplay party={transaction.fromParty} />);
    expect(screen.getByRole("button", { name: "Copy owned account number" })).toBeVisible();
    rerender(<TransactionPartyDisplay party={{ accountNumberDisplay: null, exposure: "UNAVAILABLE", displayName: null, ownedByRequester: false }} />);
    expect(screen.getByText("Account details unavailable")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
