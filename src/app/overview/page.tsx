import { AppShell } from "@/components/app-shell";
import { PersonaOverviewWorkspace } from "@/features/overview/components/persona-overview-workspace";
import { parseAccountSearchParams } from "@/features/accounts/search-params";
import { workspaceRoutes } from "@/features/auth/capabilities";
import { ProtectedWorkspace } from "@/features/auth/components/protected-workspace";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const params = parseAccountSearchParams(raw);
  const range = Array.isArray(raw.range) ? raw.range[0] : raw.range;
  return <ProtectedWorkspace capability={workspaceRoutes.overview.capability}><AppShell><PersonaOverviewWorkspace initialAccountId={params.accountId} range={range} /></AppShell></ProtectedWorkspace>;
}
