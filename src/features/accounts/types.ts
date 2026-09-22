export type AccountStatus = "ACTIVE" | "FROZEN" | "CLOSED" | string;
export type AccountType = "PERSONAL" | "BUSINESS" | "CLEARING" | "RECEIVER_PAYABLE" | "PLATFORM_REVENUE" | string;
export type CreatableAccountType = "PERSONAL" | "BUSINESS";

export type Account = {
  id: string;
  userId: string;
  accountNumber: string;
  accountType: AccountType;
  balance: string;
  currency: string;
  status: AccountStatus;
  createdAt: string;
  description: string | null;
};

export type CreateAccountRequest = {
  accountType: CreatableAccountType;
  currency: "VND";
  description: string | null;
  idempotencyKey: string;
};

export function isActiveAccount(account: Pick<Account, "status">) {
  return account.status === "ACTIVE";
}

export function accountStatusLabel(status: string) {
  return status === "ACTIVE" ? "Active" : status === "FROZEN" ? "Frozen" : status === "CLOSED" ? "Closed" : "Status unavailable";
}
