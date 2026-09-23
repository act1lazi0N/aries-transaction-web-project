import { AppShell } from "@/components/app-shell";
import { TransfersWorkspace } from "@/features/transfers/components/transfers-workspace";
import { parseTransferSearchParams } from "@/features/transfers/search-params";
import { workspaceRoutes } from "@/features/auth/capabilities";
import { ProtectedWorkspace } from "@/features/auth/components/protected-workspace";

export default async function TransfersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseTransferSearchParams(await searchParams);
  return <ProtectedWorkspace capability={workspaceRoutes.transfers.capability}><AppShell><section className="space-y-8"><div><p className="text-sm font-medium text-accent">Transfers</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Send and receive</h1><p className="mt-3 max-w-2xl text-muted">Create a backend-verified preview, review the masked recipient and total debit, then confirm once. Aries never treats submission alone as completed money movement.</p></div><TransfersWorkspace params={params} /></section></AppShell></ProtectedWorkspace>;
}
