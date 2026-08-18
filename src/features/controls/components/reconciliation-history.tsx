import { Clock3 } from "lucide-react";

export function ReconciliationHistoryUnavailable() {
  return <section aria-labelledby="reconciliation-history-title" className="rounded-2xl border border-dashed border-border bg-surface p-6"><div className="flex items-start gap-3"><Clock3 aria-hidden="true" className="mt-0.5 text-[var(--aries-warning)]" size={19} /><div><h2 id="reconciliation-history-title" className="font-semibold">Reconciliation history is not available yet</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">The service currently lets you open a run by ID, but it does not expose a run-list endpoint. No history is inferred or reconstructed in the browser.</p></div></div></section>;
}
