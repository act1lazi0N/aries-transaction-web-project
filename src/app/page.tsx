import { Activity, ArrowUpRight, Clock3, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/features/auth/components/auth-gate";

const signals = [
  { label: "Transaction activity", value: "No live data", detail: "Connect the API to see confirmed activity.", icon: Activity },
  { label: "Pending operations", value: "—", detail: "Pending state will be shown explicitly.", icon: Clock3 },
  { label: "Access posture", value: "Protected", detail: "Authorization remains backend-authoritative.", icon: ShieldCheck },
];

export default function HomePage() {
  return <AppShell><AuthGate><section className="space-y-8"><div className="max-w-3xl"><p className="mb-3 text-sm font-medium text-accent">Good morning</p><h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">A clear view of what needs attention.</h1><p className="mt-3 max-w-2xl text-base leading-7 text-muted">Aries keeps financial operations precise and calm. Connect the backend to replace this starter workspace with authoritative account and transaction data.</p></div><div className="grid gap-4 md:grid-cols-3">{signals.map(({ label, value, detail, icon: Icon }) => <article key={label} className="rounded-2xl border border-border bg-surface p-5"><div className="mb-8 flex items-center justify-between"><p className="text-sm font-medium text-muted">{label}</p><Icon aria-hidden="true" size={19} className="text-muted" /></div><p className="text-2xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-sm leading-6 text-muted">{detail}</p></article>)}</div><section aria-labelledby="next-step" className="rounded-2xl border border-border bg-surface p-6 lg:p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div><h2 id="next-step" className="text-lg font-semibold">Starter workspace is ready</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted">The next safe step is to add the authenticated API adapter and render backend-defined lifecycle states. No balance or transaction outcome is invented here.</p></div><Link href="/transactions" className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:brightness-95">Open transactions <ArrowUpRight aria-hidden="true" size={16} /></Link></div></section></section></AuthGate></AppShell>;
}
