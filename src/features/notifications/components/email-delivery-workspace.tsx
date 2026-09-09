"use client";

import { Check, Clipboard, RefreshCw, RotateCcw } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, StatusBanner, WorkspaceSkeleton } from "@/components/ui/workspace-state";
import { deliveryPurposeLabel, deliveryStatusLabel, formatNotificationDate } from "@/features/notifications/format";
import { useEmailDeliveries, useRedriveEmailDelivery } from "@/features/notifications/queries";
import type { EmailDeliveryFilters, EmailDeliveryStatus } from "@/features/notifications/types";
import { userFacingErrorMessage } from "@/lib/api/errors";

const deliveryTabs: { value: EmailDeliveryStatus; label: string }[] = [
  { value: "DEAD_LETTERED", label: "Dead-lettered" },
  { value: "FAILED", label: "Failed" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function EmailDeliveryWorkspace({ initialFilters }: { initialFilters: EmailDeliveryFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const query = useEmailDeliveries(initialFilters);
  const redrive = useRedriveEmailDelivery();
  const [unknownIds, setUnknownIds] = useState<ReadonlySet<string>>(new Set());
  const [feedback, setFeedback] = useState<{ tone: "success" | "warning"; title: string; detail: string } | null>(null);

  function update(patch: Partial<EmailDeliveryFilters>) {
    const next = { ...initialFilters, ...patch };
    router.replace(`${pathname}?status=${next.status}&page=${next.page}&size=${next.size}` as Route, { scroll: false });
  }

  async function handleRedrive(deliveryId: string) {
    setFeedback(null);
    try {
      const result = await redrive.mutateAsync(deliveryId);
      setUnknownIds(previous => without(previous, deliveryId));
      setFeedback({ tone: "success", title: "Delivery queued", detail: `The service accepted the redrive and returned ${deliveryStatusLabel(result.status)}. Delivery itself is not yet confirmed.` });
    } catch (error) {
      setUnknownIds(previous => new Set(previous).add(deliveryId));
      setFeedback({ tone: "warning", title: "Redrive outcome unknown", detail: userFacingErrorMessage(error, "Refresh the dead-letter queue before deciding whether another redrive is safe.") });
    }
  }

  async function recheck(deliveryId: string) {
    setFeedback(null);
    const result = await query.refetch();
    const stillDeadLettered = result.data?.content.some(delivery => delivery.id === deliveryId && delivery.status === "DEAD_LETTERED") ?? false;
    if (stillDeadLettered) {
      setUnknownIds(previous => without(previous, deliveryId));
      setFeedback({ tone: "warning", title: "Delivery is still dead-lettered", detail: "The refreshed queue confirms that a new explicit redrive is available." });
    } else if (result.data) {
      setFeedback({ tone: "success", title: "Delivery left this queue", detail: "The refreshed dead-letter queue no longer contains this delivery. Check another status filter for its current state." });
    }
  }

  if (query.isPending) return <WorkspaceSkeleton label="Loading notification email deliveries" />;
  if (query.isError && !query.data) return <ErrorState title="Email delivery state is unavailable" detail="Aries will not infer queue status while the service is unavailable." onRetry={() => void query.refetch()} />;

  const page = query.data;
  return <div className="space-y-6">
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-semibold text-accent">Operations / Notifications</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Email delivery recovery</h1><p className="mt-3 max-w-2xl leading-7 text-muted">Inspect durable delivery state and explicitly requeue dead-lettered work. Queued is never presented as delivered.</p></div><Button type="button" variant="ghost" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw aria-hidden="true" size={17} className={query.isFetching ? "animate-spin" : ""} /><span className="ml-2">Refresh queue</span></Button></header>
    <div className="overflow-x-auto pb-1"><Tabs label="Email delivery status" value={initialFilters.status} onValueChange={value => update({ status: value as EmailDeliveryStatus, page: 0 })} items={deliveryTabs} /></div>
    {feedback && <StatusBanner tone={feedback.tone} title={feedback.title}>{feedback.detail}</StatusBanner>}
    {query.isError && page && <StatusBanner tone="warning" title="Refresh unavailable">Showing the last confirmed delivery page.</StatusBanner>}
    {page?.content.length === 0 ? <EmptyState title={`No ${deliveryStatusLabel(initialFilters.status).toLowerCase()} deliveries`} detail="Choose another status or refresh when new delivery work is expected." /> : page && <section aria-label="Notification email deliveries" className="overflow-hidden rounded-2xl border border-border bg-surface"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Delivery</TableHead><TableHead>Purpose</TableHead><TableHead>Status</TableHead><TableHead>Attempts</TableHead><TableHead>Schedule / outcome</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{page.content.map(delivery => {
      const unknown = unknownIds.has(delivery.id);
      const pending = redrive.isPending && redrive.variables === delivery.id;
      return <TableRow key={delivery.id}><TableCell className="min-w-40"><CopyIdentifier value={delivery.id} /><p className="mt-2 text-xs text-muted">Updated {formatNotificationDate(delivery.updatedAt)}</p></TableCell><TableCell className="min-w-40">{deliveryPurposeLabel(delivery.purpose)}<p className="mt-1 text-xs text-muted">Redrives: <span className="font-mono">{delivery.redriveCount}</span></p></TableCell><TableCell><DeliveryStatusBadge status={delivery.status} />{delivery.lastErrorCode && <p className="mt-2 max-w-52 break-all font-mono text-xs text-[var(--aries-danger)]">{delivery.lastErrorCode}</p>}</TableCell><TableCell className="min-w-28"><p className="font-mono font-semibold">{delivery.attemptCount} total</p><p className="mt-1 text-xs text-muted"><span className="font-mono">{delivery.cycleAttemptCount}</span> this cycle</p></TableCell><TableCell className="min-w-44 text-xs"><Timestamp label="Next attempt" value={delivery.nextAttemptAt} /><Timestamp label="Delivered" value={delivery.deliveredAt} /></TableCell><TableCell className="min-w-32 text-right">{unknown ? <Button type="button" variant="secondary" onClick={() => void recheck(delivery.id)} disabled={query.isFetching}><RefreshCw aria-hidden="true" size={15} className={query.isFetching ? "animate-spin" : ""} /><span className="ml-2">Recheck queue</span></Button> : delivery.status === "DEAD_LETTERED" ? <Button type="button" variant="secondary" onClick={() => void handleRedrive(delivery.id)} disabled={pending}><RotateCcw aria-hidden="true" size={15} /><span className="ml-2">{pending ? "Queueing…" : "Redrive"}</span></Button> : <span className="text-xs text-muted">No action</span>}</TableCell></TableRow>;
    })}</TableBody></Table></div><div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted">Page {page.page + 1} of {Math.max(page.totalPages, 1)} · {page.totalElements} deliveries</p><div className="flex gap-2"><Button variant="secondary" disabled={page.first} onClick={() => update({ page: Math.max(0, page.page - 1) })}>Previous</Button><Button variant="secondary" disabled={page.last} onClick={() => update({ page: page.page + 1 })}>Next</Button></div></div></section>}
  </div>;
}

function DeliveryStatusBadge({ status }: { status: EmailDeliveryStatus }) {
  const tone = status === "DELIVERED" ? "success" : status === "DEAD_LETTERED" ? "danger" : status === "FAILED" ? "warning" : status === "PENDING" || status === "PROCESSING" ? "pending" : "neutral";
  return <Badge tone={tone}>{deliveryStatusLabel(status)}</Badge>;
}

function Timestamp({ label, value }: { label: string; value: string | null }) {
  return <p className="mb-1"><span className="text-muted">{label}:</span> {value ? <time dateTime={value}>{formatNotificationDate(value)}</time> : "—"}</p>;
}

function CopyIdentifier({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); }
    catch { setCopied(false); }
  }
  return <div className="flex items-start gap-2"><span className="break-all font-mono text-xs">{value}</span><button type="button" className="shrink-0 rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground" aria-label={`Copy delivery ID ${value}`} onClick={() => void copy()}>{copied ? <Check aria-hidden="true" size={14} /> : <Clipboard aria-hidden="true" size={14} />}</button></div>;
}

function without(values: ReadonlySet<string>, value: string) {
  const next = new Set(values); next.delete(value); return next;
}
