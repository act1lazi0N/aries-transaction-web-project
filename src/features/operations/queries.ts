import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { getCustomer, getCustomers, getLedgerEntries, getLedgerJournal, getOperationsOverview, getOperationsTransactions, updateCustomerStatus } from "@/features/operations/api";
import type { CustomerFilters, LedgerFilters, OperationTransactionFilters } from "@/features/operations/types";

export const operationsKeys = {
  all: ["operations"] as const,
  overview: (range: string) => [...operationsKeys.all, "overview", range] as const,
  customers: (filters: CustomerFilters) => [...operationsKeys.all, "customers", filters] as const,
  customer: (id: string) => [...operationsKeys.all, "customer", id] as const,
  transactions: (filters: OperationTransactionFilters) => [...operationsKeys.all, "transactions", filters] as const,
  ledger: (filters: LedgerFilters) => [...operationsKeys.all, "ledger", filters] as const,
  journal: (id: string) => [...operationsKeys.all, "journal", id] as const,
};

export function useOperationsOverview(range: string) { const session = useAuthSession(); return useQuery({ queryKey: operationsKeys.overview(range), queryFn: () => getOperationsOverview(range, session.request), enabled: session.status === "authenticated", retry: false, staleTime: 30_000 }); }
export function useCustomers(filters: CustomerFilters) { const session = useAuthSession(); return useQuery({ queryKey: operationsKeys.customers(filters), queryFn: () => getCustomers(filters, session.request), enabled: session.status === "authenticated", retry: false, placeholderData: keepPreviousData }); }
export function useCustomer(id?: string) { const session = useAuthSession(); return useQuery({ queryKey: operationsKeys.customer(id ?? ""), queryFn: () => getCustomer(id ?? "", session.request), enabled: session.status === "authenticated" && Boolean(id), retry: false }); }
export function useOperationsTransactions(filters: OperationTransactionFilters) { const session = useAuthSession(); return useQuery({ queryKey: operationsKeys.transactions(filters), queryFn: () => getOperationsTransactions(filters, session.request), enabled: session.status === "authenticated", retry: false, placeholderData: keepPreviousData }); }
export function useLedgerEntries(filters: LedgerFilters) { const session = useAuthSession(); return useQuery({ queryKey: operationsKeys.ledger(filters), queryFn: () => getLedgerEntries(filters, session.request), enabled: session.status === "authenticated", retry: false, placeholderData: keepPreviousData }); }
export function useLedgerJournal(id?: string) { const session = useAuthSession(); return useQuery({ queryKey: operationsKeys.journal(id ?? ""), queryFn: () => getLedgerJournal(id ?? "", session.request), enabled: session.status === "authenticated" && Boolean(id), retry: false }); }

export function useUpdateCustomerStatus() {
  const session = useAuthSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, status, reason, expectedVersion }: { customerId: string; status: "ACTIVE" | "SUSPENDED"; reason: string; expectedVersion: number }) => updateCustomerStatus(customerId, { status, reason, expectedVersion }, session.request),
    retry: false,
    onSettled: async (_data, _error, variables) => {
      await Promise.all([client.invalidateQueries({ queryKey: [...operationsKeys.all, "customers"] }), client.invalidateQueries({ queryKey: operationsKeys.customer(variables.customerId) }), client.invalidateQueries({ queryKey: [...operationsKeys.all, "overview"] })]);
    },
  });
}
