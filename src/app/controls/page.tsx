import { AppShell } from "@/components/app-shell";

export default function ControlsPage() {
  return <AppShell><section className="space-y-3"><p className="text-sm font-medium text-accent">Controls</p><h1 className="text-3xl font-semibold tracking-tight">Operational controls</h1><p className="max-w-2xl text-muted">Authorization and operational controls will be surfaced only from backend-defined permissions and policy responses.</p><div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-10 text-center"><p className="font-medium">No control source connected</p><p className="mt-2 text-sm text-muted">No permission or policy state is invented in this starter route.</p></div></section></AppShell>;
}
