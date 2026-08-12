import { AppShell } from "@/components/app-shell";

export default function SettingsPage() {
  return <AppShell><section className="space-y-3"><p className="text-sm font-medium text-accent">Settings</p><h1 className="text-3xl font-semibold tracking-tight">Workspace settings</h1><p className="max-w-2xl text-muted">Account, authorization, and notification settings will be connected to backend contracts in a later feature slice.</p><div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-10 text-center"><p className="font-medium">No settings source connected</p><p className="mt-2 text-sm text-muted">No authorization or account state is inferred in this starter route.</p></div></section></AppShell>;
}
