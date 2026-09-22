import { AppShell } from "@/components/app-shell";
import { ProtectedWorkspace } from "@/features/auth/components/protected-workspace";
import { workspaceRoutes } from "@/features/auth/capabilities";
import { OperationsOverviewWorkspace } from "@/features/operations/components/operations-overview-workspace";

export default async function OperationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams; const range = Array.isArray(params.range) ? params.range[0] : params.range;
  return <ProtectedWorkspace capability={workspaceRoutes.operations.capability}><AppShell><OperationsOverviewWorkspace initialRange={range} /></AppShell></ProtectedWorkspace>;
}
