import { AppShell } from "@/components/app-shell";
import { ProtectedWorkspace } from "@/features/auth/components/protected-workspace";
import { workspaceRoutes } from "@/features/auth/capabilities";
import { LedgerWorkspace } from "@/features/operations/components/ledger-workspace";
import type { LedgerFilters } from "@/features/operations/types";

export default async function LedgerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams; const get = (key: string) => Array.isArray(raw[key]) ? raw[key]?.[0] : raw[key]; const limit = Number.parseInt(get("limit") ?? "50", 10); const direction = get("direction");
  const filters: LedgerFilters = { from: get("from") || undefined, to: get("to") || undefined, transactionId: get("transactionId") || undefined, entryType: get("entryType") || undefined, direction: direction === "DEBIT" || direction === "CREDIT" ? direction : undefined, currency: get("currency") || undefined, cursor: get("cursor") || undefined, limit: Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 50 };
  return <ProtectedWorkspace capability={workspaceRoutes.ledger.capability}><AppShell><LedgerWorkspace initialFilters={filters} initialJournalId={get("journal") || undefined} /></AppShell></ProtectedWorkspace>;
}
