import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { TransferWorkflow } from "@/features/transfers/components/transfer-workflow";
import type { Account } from "@/features/accounts/types";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  preview: vi.fn(),
  execute: vi.fn(),
  refetchAccounts: vi.fn(),
  refetchTransaction: vi.fn(),
  accounts: [] as Account[],
  accountsError: null as Error | null,
  transaction: undefined as unknown,
  transactionError: null as Error | null,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/features/auth/components/auth-gate", () => ({ AuthGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/features/accounts/queries", () => ({
  useAccounts: () => ({ data: mocks.accounts, error: mocks.accountsError, isPending: false, isFetching: false, refetch: mocks.refetchAccounts }),
}));
vi.mock("@/features/transfers/mutations", () => ({
  useCreateTransferPreview: () => ({ mutateAsync: mocks.preview, isPending: false }),
  useExecuteTransferPreview: () => ({ mutateAsync: mocks.execute, isPending: false }),
}));
vi.mock("@/features/transactions/queries", () => ({
  useTransactionDetail: () => ({ data: mocks.transaction, error: mocks.transactionError, isPending: false, refetch: mocks.refetchTransaction }),
}));

const sourceAccount: Account = {
  id: "source-1", userId: "user-1", accountNumber: "111122223333", accountType: "PERSONAL", balance: "500000.00", currency: "VND", status: "ACTIVE", createdAt: "2026-08-01T00:00:00Z", description: null,
};
const destinationAccount: Account = {
  id: "destination-2", userId: "user-1", accountNumber: "444455556666", accountType: "PERSONAL", balance: "250000.00", currency: "VND", status: "ACTIVE", createdAt: "2026-08-01T00:00:00Z", description: null,
};
const preview = {
  previewId: "preview-123",
  expiresAt: "2099-08-28T08:05:00Z",
  source: { accountNumberMasked: "******3333", displayName: "Personal account" },
  recipient: { accountNumberMasked: "******7777", displayName: "Verified recipient" },
  amount: "1000.00",
  fee: "10.00",
  debitTotal: "1010.00",
  currency: "VND" as const,
  warnings: ["Recipient details were verified by the service."],
};
const completedTransaction = {
  id: "transaction-1", fromAccountId: "source-1", toAccountId: "recipient-2", amount: "1000.00", currency: "VND", status: "COMPLETED",
  idempotencyKey: "stable-key-00000001", description: null, failureReason: null, originalTransactionId: null, refundedAmount: "0",
  createdAt: "2026-08-28T08:00:00Z", completedAt: "2026-08-28T08:00:01Z",
};

describe("TransferWorkflow", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.accounts = [sourceAccount];
    mocks.accountsError = null;
    mocks.transaction = undefined;
    mocks.transactionError = null;
    mocks.preview.mockResolvedValue(preview);
    mocks.execute.mockResolvedValue(completedTransaction);
  });

  it("creates an external preview with one account and renders only backend-masked review data", async () => {
    const user = userEvent.setup();
    render(<TransferWorkflow routeMode="external" />);

    await fillExternalDraft(user);
    await user.click(screen.getByRole("button", { name: "Review transfer" }));

    expect(await screen.findByRole("heading", { name: "Review before sending" })).toBeVisible();
    expect(mocks.preview).toHaveBeenCalledWith({ mode: "EXTERNAL", sourceAccountId: "source-1", recipientAccountNumber: "000011117777", amount: "1000.00", currency: "VND", description: undefined });
    const status = screen.getByRole("heading", { name: "Review before sending" }).closest("section");
    expect(status).not.toBeNull();
    expect(within(status!).getByText("******7777")).toBeVisible();
    expect(within(status!).queryByText("000011117777")).not.toBeInTheDocument();
    expect(within(status!).getByText("Total debit").parentElement).toHaveTextContent("1010");
  });

  it("shows three draft steps and preserves completed fields when moving back", async () => {
    const user = userEvent.setup();
    render(<TransferWorkflow routeMode="external" />);

    expect(screen.getByRole("heading", { name: "Choose a destination" })).toBeVisible();
    expect(screen.queryByLabelText("Source account")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Amount/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Choose the accounts" })).toHaveFocus();
    expect(screen.queryByLabelText(/^Amount/)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Source account"), "source-1");
    await user.type(screen.getByLabelText("Recipient account number"), "000011117777");

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Enter the amount and note" })).toHaveFocus();
    expect(screen.queryByLabelText("Source account")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/^Amount/), "1000.00");

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Source account")).toHaveValue("source-1");
    expect(screen.getByLabelText("Recipient account number")).toHaveValue("000011117777");
    expect(mocks.preview).not.toHaveBeenCalled();
  });

  it("keeps account loading failures distinct from an empty eligible account list", async () => {
    mocks.accounts = [];
    mocks.accountsError = new Error("service unavailable");
    const user = userEvent.setup();
    render(<TransferWorkflow routeMode="external" />);

    expect(screen.getByRole("alert")).toHaveTextContent("We could not load your accounts");
    expect(screen.queryByText(/You need one active VND account/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.refetchAccounts).toHaveBeenCalledTimes(1);
  });

  it("returns to the preserved draft and invalidates review data when details are edited", async () => {
    const user = userEvent.setup();
    render(<TransferWorkflow routeMode="external" />);

    await fillExternalDraft(user);
    await user.click(screen.getByRole("button", { name: "Review transfer" }));
    await user.click(await screen.findByRole("button", { name: "Edit details" }));

    expect(screen.queryByRole("heading", { name: "Review before sending" })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Amount/)).toHaveValue("1000.00");
    expect(screen.getByRole("button", { name: "Review transfer" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Recipient account number")).toHaveValue("000011117777");
  });

  it("requires two eligible accounts for own-account mode", async () => {
    const user = userEvent.setup();
    render(<TransferWorkflow routeMode="external" />);

    await user.click(screen.getByRole("button", { name: /Between my accounts/ }));

    expect(screen.getByText("You need two active VND accounts to transfer between your accounts.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("prevents duplicate execute calls and renders completed styling only from the transaction response", async () => {
    let resolveExecute: (value: typeof completedTransaction) => void = () => undefined;
    mocks.execute.mockImplementation(() => new Promise(resolve => { resolveExecute = resolve; }));
    const user = userEvent.setup();
    render(<TransferWorkflow routeMode="external" />);

    await fillExternalDraft(user);
    await user.click(screen.getByRole("button", { name: "Review transfer" }));
    const confirm = await screen.findByRole("button", { name: "Confirm and send" });
    await user.dblClick(confirm);

    expect(mocks.execute).toHaveBeenCalledTimes(1);
    resolveExecute(completedTransaction);
    expect(await screen.findByRole("heading", { name: "Transfer completed" })).toBeVisible();
  });

  it("prevents double Enter from creating a second execute call", async () => {
    let resolveExecute: (value: typeof completedTransaction) => void = () => undefined;
    mocks.execute.mockImplementation(() => new Promise(resolve => { resolveExecute = resolve; }));
    const user = userEvent.setup();
    render(<TransferWorkflow routeMode="external" />);

    await fillExternalDraft(user);
    await user.click(screen.getByRole("button", { name: "Review transfer" }));
    const confirm = await screen.findByRole("button", { name: "Confirm and send" });
    confirm.focus();
    await user.keyboard("{Enter}{Enter}");

    expect(mocks.execute).toHaveBeenCalledTimes(1);
    resolveExecute(completedTransaction);
    expect(await screen.findByRole("heading", { name: "Transfer completed" })).toBeVisible();
  });

  it.each([
    ["PENDING", "Transfer processing"],
    ["FAILED", "Transfer failed"],
  ])("uses backend %s status without completed styling", (status, heading) => {
    mocks.transaction = { ...completedTransaction, status };

    render(<TransferWorkflow routeMode="external" transactionId="transaction-1" />);

    expect(screen.getByRole("heading", { name: heading })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Transfer completed" })).not.toBeInTheDocument();
  });

  it("keeps draft data during preview throttling and does not retry automatically", async () => {
    mocks.preview.mockRejectedValue(new ApiError("internal throttle", { kind: "rate_limited", status: 429, code: "RATE_LIMITED", retryAfterSeconds: 10 }));
    const user = userEvent.setup();
    render(<TransferWorkflow routeMode="external" />);

    await fillExternalDraft(user);
    await user.click(screen.getByRole("button", { name: "Review transfer" }));

    expect(await screen.findByText(/Too many preview requests/)).toBeVisible();
    expect(screen.getByLabelText(/^Amount/)).toHaveValue("1000.00");
    expect(screen.getByRole("button", { name: "Review transfer" })).toBeDisabled();
    expect(mocks.preview).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Recipient account number")).toHaveValue("000011117777");
  });

  it("uses privacy-preserving recipient copy and keeps the draft", async () => {
    mocks.preview.mockRejectedValue(new ApiError("Account 000011117777 exists but is frozen", { kind: "validation", status: 422, code: "RECIPIENT_UNAVAILABLE" }));
    const user = userEvent.setup();
    render(<TransferWorkflow routeMode="external" />);

    await fillExternalDraft(user);
    await user.click(screen.getByRole("button", { name: "Review transfer" }));

    expect(await screen.findByText("The recipient is unavailable. Check the account number or use a different recipient.")).toBeVisible();
    expect(screen.queryByText(/exists but is frozen/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Recipient account number")).toHaveValue("000011117777");
  });

  it("preserves the execute pair through an unknown outcome and manual safe retry", async () => {
    mocks.execute.mockRejectedValueOnce(new ApiError("network detail", { kind: "network", requestId: "request-1" })).mockResolvedValueOnce(completedTransaction);
    const user = userEvent.setup();
    render(<TransferWorkflow routeMode="external" />);

    await fillExternalDraft(user);
    await user.click(screen.getByRole("button", { name: "Review transfer" }));
    await user.click(await screen.findByRole("button", { name: "Confirm and send" }));
    expect(await screen.findByRole("heading", { name: "Transfer status unavailable" })).toBeVisible();
    const firstRequest = mocks.execute.mock.calls[0][0];

    await user.click(screen.getByRole("button", { name: "Check safely" }));

    expect(await screen.findByRole("heading", { name: "Transfer completed" })).toBeVisible();
    expect(mocks.execute).toHaveBeenCalledTimes(2);
    expect(mocks.execute.mock.calls[1][0]).toEqual(firstRequest);
  });

  it("expires a stale preview locally before confirmation", async () => {
    mocks.preview.mockResolvedValue({ ...preview, expiresAt: "2000-01-01T00:00:00Z" });
    const user = userEvent.setup();
    render(<TransferWorkflow routeMode="external" />);

    await fillExternalDraft(user);
    await user.click(screen.getByRole("button", { name: "Review transfer" }));

    expect(await screen.findByRole("heading", { name: "Preview unavailable" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Confirm and send" })).not.toBeInTheDocument();
  });
});

async function fillExternalDraft(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.selectOptions(screen.getByLabelText("Source account"), "source-1");
  await user.type(screen.getByLabelText("Recipient account number"), "000011117777");
  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.type(screen.getByLabelText(/^Amount/), "1000.00");
}
