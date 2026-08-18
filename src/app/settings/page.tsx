import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { SettingsWorkspace } from "@/features/settings/components/settings-workspace";

export default function SettingsPage() {
  return <AppShell><AuthGate><SettingsWorkspace /></AuthGate></AppShell>;
}
