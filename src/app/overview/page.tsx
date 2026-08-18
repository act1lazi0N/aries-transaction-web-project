import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { OverviewWorkspace } from "@/features/overview/components/overview-workspace";
import { parseAccountSearchParams } from "@/features/accounts/search-params";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseAccountSearchParams(await searchParams);
  return <AppShell><AuthGate><OverviewWorkspace initialAccountId={params.accountId} /></AuthGate></AppShell>;
}
