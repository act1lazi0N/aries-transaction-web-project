import type { TransactionRead } from "@/features/transactions/types";

export type CustomerStatus = "ACTIVE" | "SUSPENDED";
export type CustomerRole = "USER" | "MERCHANT";

export type CustomerSummary = {
  id: string;
  fullName: string;
  email: string;
  role: CustomerRole;
  status: CustomerStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type CustomerAccount = {
  maskedAccountNumber: string;
  type: string;
  currency: string;
  status: string;
  createdAt: string;
};

export type CustomerDetail = { customer: CustomerSummary; accounts: CustomerAccount[]; recentActivity: TransactionRead[] };

export type PageResponse<T> = { content: T[]; page: number; size: number; totalElements: number; totalPages: number; first: boolean; last: boolean };

export type OperationsOverview = {
  range: "24h" | "7d" | "30d";
  generatedAt: string;
  customers: { users: number; merchants: number; active: number; suspended: number };
  transactions: { total: number; pending: number; failed: number };
  reconciliation: { runs: number; exceptions: number };
  settlements: { batches: number; pending: number; failed: number };
  ledger: { entries: number; journals: number; unbalancedJournals: number; healthy: boolean };
};

export type LedgerEntry = {
  entryId: string;
  transactionId: string;
  maskedAccountReference: string;
  direction: "DEBIT" | "CREDIT";
  amount: string;
  currency: string;
  entryType: string;
  createdAt: string;
  balanced: boolean;
};

export type LedgerPage = { content: LedgerEntry[]; nextCursor: string | null; hasMore: boolean };
export type LedgerJournal = { transactionId: string; entries: LedgerEntry[]; totalDebits: string; totalCredits: string; balanced: boolean };

export type CustomerFilters = { search?: string; role?: CustomerRole; status?: CustomerStatus; page: number; size: number; sort?: string; direction?: "asc" | "desc" };
export type OperationTransactionFilters = { transactionId?: string; status?: string; currency?: string; from?: string; to?: string; page: number; size: number };
export type LedgerFilters = { from?: string; to?: string; transactionId?: string; entryType?: string; direction?: "DEBIT" | "CREDIT"; currency?: string; cursor?: string; limit: number };
