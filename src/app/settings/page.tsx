import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/features/auth/components/auth-gate";

export default function SettingsPage() {
  return <AppShell><AuthGate><section className="space-y-3"><p className="text-sm font-medium text-accent">Settings</p><h1 className="text-3xl font-semibold tracking-tight">Workspace settings</h1><p className="max-w-2xl text-muted">Account, access, and notification settings will be available here once their service connections are ready.</p><div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-10 text-center"><p className="font-medium">Settings are not available yet</p><p className="mt-2 text-sm text-muted">There are no settings to change right now. Your account and access remain managed by the service.</p></div></section></AuthGate></AppShell>;
}
