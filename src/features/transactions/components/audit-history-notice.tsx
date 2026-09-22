export function AuditHistoryUnavailable() {
  return <section aria-labelledby="audit-availability-title" className="mt-6 rounded-xl border border-dashed border-border bg-surface-muted p-4">
    <h3 id="audit-availability-title" className="font-semibold">Audit history</h3>
    <p className="mt-1 text-sm leading-6 text-muted">Audit events are not available from the current service API. This record shows only the confirmed transaction fields above.</p>
  </section>;
}
