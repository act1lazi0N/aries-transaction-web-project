"use client";

import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, StatusBanner, WorkspaceSkeleton } from "@/components/ui/workspace-state";
import { StatStrip } from "@/components/ui/stat-strip";
import { Tabs } from "@/components/ui/tabs";
import { formatMoney } from "@/features/accounts/format";
import type { MerchantCurrencyOverview } from "@/features/overview/merchant-types";
import { useMerchantOverview } from "@/features/overview/merchant-queries";

const ranges = ["7d", "30d", "90d"] as const;

export function MerchantOverviewWorkspace({ initialRange }: { initialRange?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const range = ranges.includes(initialRange as typeof ranges[number]) ? initialRange! : "30d";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const query = useMerchantOverview(range, timezone);
  function changeRange(next: string) { router.replace(`${pathname}?range=${next}` as Route, { scroll: false }); }
  if (query.isPending) return <WorkspaceSkeleton label="Loading merchant overview" />;
  if (query.isError && !query.data) return <ErrorState title="We could not load the merchant overview" detail="No cashflow or settlement result is inferred while the service is unavailable." onRetry={() => void query.refetch()} />;
  if (!query.data || query.data.currencies.length === 0) return <EmptyState title="No merchant activity yet" detail="There are no backend-confirmed currency buckets for this period." />;
  return <div className="space-y-7">
    <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-sm font-semibold text-accent">Merchant Overview</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Cashflow, settlement, and attention.</h1><p className="mt-3 max-w-2xl leading-7 text-muted">Every amount stays inside its original currency. Pending activity is separated from confirmed movement.</p></div><div className="flex items-center gap-2"><Tabs label="Overview range" value={range} onValueChange={changeRange} items={ranges.map(value => ({ value, label: value.toUpperCase() }))} /><Button variant="ghost" aria-label="Refresh merchant overview" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw aria-hidden="true" size={17} className={query.isFetching ? "animate-spin" : ""} /></Button></div></header>
    {query.isError && <StatusBanner tone="warning" title="Refresh unavailable">The last confirmed overview remains visible.</StatusBanner>}
    {query.data.currencies.map(bucket => <CurrencyWorkspace key={bucket.currency} bucket={bucket} />)}
  </div>;
}

function CurrencyWorkspace({ bucket }: { bucket: MerchantCurrencyOverview }) {
  return <section aria-labelledby={`merchant-${bucket.currency}`} className="space-y-4"><div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Currency workspace</p><h2 id={`merchant-${bucket.currency}`} className="mt-1 text-2xl font-semibold">{bucket.currency}</h2></div><p className="font-mono text-sm text-muted">No cross-currency total</p></div><StatStrip items={[{ label: "Available balance", value: formatMoney(bucket.balance, bucket.currency) }, { label: "Confirmed inflow", value: formatMoney(bucket.inflow, bucket.currency), tone: "success" }, { label: "Confirmed outflow", value: formatMoney(bucket.outflow, bucket.currency) }, { label: "Pending", value: formatMoney(bucket.pending, bucket.currency), detail: `${bucket.pendingCount} items`, tone: "warning" }]} /><div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]"><TrendChart bucket={bucket} /><div className="rounded-2xl border border-border bg-surface p-5"><h3 className="font-semibold">Settlement snapshot</h3><dl className="mt-5 space-y-4 text-sm"><Row label="Net settlement" value={formatMoney(bucket.settlementNet, bucket.currency)} /><Row label="Refunds issued" value={formatMoney(bucket.refunds, bucket.currency)} /><Row label="Currency" value={bucket.currency} /></dl></div></div></section>;
}

function TrendChart({ bucket }: { bucket: MerchantCurrencyOverview }) {
  const values = bucket.trend.flatMap(point => [Number(point.inflow), Number(point.outflow)]).filter(Number.isFinite);
  const max = Math.max(...values, 1);
  const points = (key: "inflow" | "outflow") => bucket.trend.map((point, index) => `${bucket.trend.length <= 1 ? 50 : index / (bucket.trend.length - 1) * 100},${44 - Number(point[key]) / max * 38}`).join(" ");
  return <div className="rounded-2xl border border-border bg-surface p-5"><div className="flex items-center justify-between"><h3 className="font-semibold">Cashflow trend</h3><div className="flex gap-3 text-xs text-muted"><span><i className="mr-1 inline-block size-2 rounded-full bg-accent" />Inflow</span><span><i className="mr-1 inline-block size-2 rounded-full bg-slate-500" />Outflow</span></div></div><svg viewBox="0 0 100 48" role="img" aria-labelledby={`chart-title-${bucket.currency} chart-desc-${bucket.currency}`} className="mt-5 h-48 w-full overflow-visible"><title id={`chart-title-${bucket.currency}`}>{bucket.currency} cashflow trend</title><desc id={`chart-desc-${bucket.currency}`}>Daily confirmed inflow and outflow. Exact amounts are available in the table below.</desc><path d="M0 44H100" stroke="var(--aries-border)" strokeWidth="0.5" /><polyline fill="none" stroke="var(--aries-accent)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" points={points("inflow")} /><polyline fill="none" stroke="#64748b" strokeWidth="1.4" vectorEffect="non-scaling-stroke" points={points("outflow")} /></svg><details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-muted">View exact daily amounts</summary><div className="mt-3 max-h-64 overflow-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted"><th className="py-2">Date</th><th className="py-2 text-right">Inflow</th><th className="py-2 text-right">Outflow</th></tr></thead><tbody>{bucket.trend.map(point => <tr key={point.date} className="border-b border-border"><td className="py-2">{point.date}</td><td className="py-2 text-right font-mono">{formatMoney(point.inflow, bucket.currency)}</td><td className="py-2 text-right font-mono">{formatMoney(point.outflow, bucket.currency)}</td></tr>)}</tbody></table></div></details></div>;
}
function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4"><dt className="text-muted">{label}</dt><dd className="text-right font-mono font-semibold">{value}</dd></div>; }
