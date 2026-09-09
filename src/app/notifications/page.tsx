import { AppShell } from "@/components/app-shell";
import { ProtectedWorkspace } from "@/features/auth/components/protected-workspace";
import { workspaceRoutes } from "@/features/auth/capabilities";
import { NotificationWorkspace } from "@/features/notifications/components/notification-workspace";
import { parseNotificationSearchParams } from "@/features/notifications/search-params";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseNotificationSearchParams(await searchParams);
  return <ProtectedWorkspace capability={workspaceRoutes.notifications.capability}><AppShell><NotificationWorkspace initialFilters={filters} /></AppShell></ProtectedWorkspace>;
}
