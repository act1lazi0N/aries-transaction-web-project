import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountSelect } from "@/features/accounts/components/account-selector";
import type { Account } from "@/features/accounts/types";

const accounts: Account[] = [
  {
    id: "account-active",
    userId: "user-1",
    accountNumber: "123456789012",
    accountType: "PERSONAL",
    balance: "9007199254740993.000000000000000001",
    currency: "USD",
    status: "ACTIVE",
    createdAt: "2026-08-19T08:00:00Z",
    description: null,
  },
  {
    id: "account-secondary",
    userId: "user-1",
    accountNumber: "210987654322",
    accountType: "BUSINESS",
    balance: "100.00",
    currency: "USD",
    status: "ACTIVE",
    createdAt: "2026-08-19T08:00:00Z",
    description: null,
  },
  {
    id: "account-frozen",
    userId: "user-1",
    accountNumber: "210987654321",
    accountType: "BUSINESS",
    balance: "100.00",
    currency: "USD",
    status: "FROZEN",
    createdAt: "2026-08-19T08:00:00Z",
    description: null,
  },
];

describe("AccountSelect", () => {
  it("keeps account selection keyboard-operable and exposes the selected context", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<AccountSelect accounts={accounts} value="account-active" onChange={onChange} />);

    const select = screen.getByRole("combobox", { name: "Account" });
    expect(select).toHaveValue("account-active");
    expect(screen.getByText(/Personal/)).toBeInTheDocument();
    expect(screen.getByText(/9007199254740993/)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /210987654321/ })).toBeDisabled();

    await user.selectOptions(select, "account-secondary");
    expect(onChange).toHaveBeenCalledWith("account-secondary");
  });

  it("preserves a recoverable refresh action when the account read fails", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<AccountSelect accounts={[]} onChange={vi.fn()} error={new Error("unavailable")} onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("We could not load your accounts.");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
