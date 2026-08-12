"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-background px-6"><section role="alert" className="max-w-md rounded-2xl border border-border bg-surface p-8 text-center"><p className="text-sm font-medium text-[var(--aries-danger)]">Something needs attention</p><h1 className="mt-2 text-2xl font-semibold">The workspace could not load</h1><p className="mt-3 text-sm leading-6 text-muted">No financial state was changed. Try loading the workspace again.</p><button type="button" onClick={reset} className="mt-6 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground">Try again</button></section></main>;
}
