import { AppShell } from "@/components/app-shell";
import { OverviewWorkspace } from "@/features/overview/components/overview-workspace";
import { parseAccountSearchParams } from "@/features/accounts/search-params";
import { workspaceRoutes } from "@/features/auth/capabilities";
import { ProtectedWorkspace } from "@/features/auth/components/protected-workspace";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseAccountSearchParams(await searchParams);
  return <ProtectedWorkspace capability={workspaceRoutes.overview.capability}><AppShell><OverviewWorkspace initialAccountId={params.accountId} /></AppShell></ProtectedWorkspace>;
}
