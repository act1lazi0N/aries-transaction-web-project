import { AppShell } from "@/components/app-shell";
import { ProtectedWorkspace } from "@/features/auth/components/protected-workspace";
import { workspaceRoutes } from "@/features/auth/capabilities";
import { EmailDeliveryWorkspace } from "@/features/notifications/components/email-delivery-workspace";
import { parseEmailDeliverySearchParams } from "@/features/notifications/search-params";

export default async function NotificationEmailDeliveriesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseEmailDeliverySearchParams(await searchParams);
  return <ProtectedWorkspace capability={workspaceRoutes.notificationDeliveries.capability}><AppShell><EmailDeliveryWorkspace initialFilters={filters} /></AppShell></ProtectedWorkspace>;
}
