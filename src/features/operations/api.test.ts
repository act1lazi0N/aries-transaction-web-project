import { describe, expect, it, vi } from "vitest";
import { getCustomers, getLedgerEntries, getOperationsOverview, updateCustomerStatus } from "@/features/operations/api";
import type { AuthRequest } from "@/features/auth/request-types";

function requestWith(value: unknown) {
  return vi.fn().mockResolvedValue(value) as unknown as AuthRequest;
}

describe("operations contracts", () => {
  it("parses the operations health snapshot without inventing financial totals", async () => {
    const value = await getOperationsOverview("24h", requestWith({ range: "24h", generatedAt: "2026-09-01T00:00:00Z", customers: { users: 4, merchants: 2, active: 5, suspended: 1 }, transactions: { total: 10, pending: 2, failed: 1 }, reconciliation: { runs: 2, exceptions: 1 }, settlements: { batches: 3, pending: 1, failed: 0 }, ledger: { entries: 20, journals: 10, unbalancedJournals: 0, healthy: true } }));
    expect(value.ledger).toEqual({ entries: 20, journals: 10, unbalancedJournals: 0, healthy: true });
    expect(value).not.toHaveProperty("balance");
  });

  it("keeps customer version and only accepts customer roles", async () => {
    const request = requestWith({ content: [{ id: "customer-1", fullName: "Merchant One", email: "m@example.com", role: "MERCHANT", status: "ACTIVE", version: 7, createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z" }], page: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true });
    const page = await getCustomers({ page: 0, size: 20 }, request);
    expect(page.content[0]).toMatchObject({ role: "MERCHANT", version: 7 });
  });

  it("preserves large ledger money strings and discards unexpected PII", async () => {
    const request = requestWith({ content: [{ entryId: "entry-1", transactionId: "tx-1", maskedAccountReference: "********1234", direction: "DEBIT", amount: "1234567890123456.78", currency: "VND", entryType: "TRANSFER", createdAt: "2026-09-01T00:00:00Z", balanced: true, email: "should-not-leak@example.com" }], nextCursor: "cursor", hasMore: true });
    const page = await getLedgerEntries({ limit: 50 }, request);
    expect(page.content[0].amount).toBe("1234567890123456.78");
    expect(page.content[0]).not.toHaveProperty("email");
  });

  it("marks status changes as non-replayable authenticated mutations", async () => {
    const request = requestWith({ id: "customer-1", fullName: "User One", email: "u@example.com", role: "USER", status: "SUSPENDED", version: 2, createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z" });
    await updateCustomerStatus("customer-1", { status: "SUSPENDED", reason: "Verified review", expectedVersion: 1 }, request);
    expect(request).toHaveBeenCalledWith("/api/v1/operations/customers/customer-1/status", expect.objectContaining({ method: "PATCH", financialMutation: true }));
  });
});
