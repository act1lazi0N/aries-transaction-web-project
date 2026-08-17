import { AppShell } from "@/components/app-shell";
import { TransferWorkflow } from "@/features/transfers/components/transfer-workflow";

export default function TransfersPage() {
  return <AppShell><section className="space-y-8"><div><p className="text-sm font-medium text-accent">Transfers</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Send a transfer</h1><p className="mt-3 max-w-2xl text-muted">Review the source, destination, amount, currency, and consequence before the backend receives the request.</p></div><TransferWorkflow /></section></AppShell>;
}
