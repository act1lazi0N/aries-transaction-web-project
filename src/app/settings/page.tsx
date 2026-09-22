import { AppShell } from "@/components/app-shell";
import { workspaceRoutes } from "@/features/auth/capabilities";
import { ProtectedWorkspace } from "@/features/auth/components/protected-workspace";
import { SettingsWorkspace } from "@/features/settings/components/settings-workspace";

export default function SettingsPage() {
  return <ProtectedWorkspace capability={workspaceRoutes.settings.capability}><AppShell><SettingsWorkspace /></AppShell></ProtectedWorkspace>;
}
