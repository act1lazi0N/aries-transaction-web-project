"use client";

import { ArrowDownLeft, ArrowRight, ArrowUpRight, BellRing, RefreshCw, Repeat2, Webhook } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState, ErrorState, StatusBanner, WorkspaceSkeleton } from "@/components/ui/workspace-state";
import { formatMoney } from "@/features/accounts/format";
import { directionLabel, formatNotificationDate } from "@/features/notifications/format";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications, useUnreadNotificationCount } from "@/features/notifications/queries";
import type { NotificationFilters, NotificationRecord } from "@/features/notifications/types";
import { userFacingErrorMessage } from "@/lib/api/errors";

const statusTabs = [
  { value: "ALL", label: "All" },
  { value: "UNREAD", label: "Unread" },
  { value: "READ", label: "Read" },
] as const;

export function NotificationWorkspace({ initialFilters }: { initialFilters: NotificationFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const notifications = useNotifications(initialFilters);
  const unread = useUnreadNotificationCount();
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const markingIds = useRef(new Set<string>());
  const markingAll = useRef(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "warning"; title: string; detail: string } | null>(null);

  function update(patch: Partial<NotificationFilters>) {
    const next = { ...initialFilters, ...patch };
    router.replace(`${pathname}?status=${next.status}&page=${next.page}&size=${next.size}` as Route, { scroll: false });
  }

  async function handleMarkRead(notificationId: string) {
    if (markingIds.current.has(notificationId)) return;
    markingIds.current.add(notificationId);
    setFeedback(null);
    try {
      await markOne.mutateAsync(notificationId);
      setFeedback({ tone: "success", title: "Notification marked as read", detail: "The service confirmed the updated read state." });
    } catch (error) {
      setFeedback({ tone: "warning", title: "Read state not confirmed", detail: userFacingErrorMessage(error, "Refresh the list before trying again.") });
    } finally {
      markingIds.current.delete(notificationId);
    }
  }

  async function handleMarkAll() {
    if (markingAll.current) return;
    markingAll.current = true;
    setFeedback(null);
    try {
      const result = await markAll.mutateAsync();
      setFeedback({ tone: "success", title: "Notifications marked as read", detail: `${result.updatedCount} notification${result.updatedCount === 1 ? "" : "s"} updated through ${formatNotificationDate(result.readThrough)}.` });
    } catch (error) {
      setFeedback({ tone: "warning", title: "Read state not confirmed", detail: userFacingErrorMessage(error, "Refresh the list before trying again.") });
    } finally {
      markingAll.current = false;
    }
  }

  if (notifications.isPending) return <WorkspaceSkeleton label="Loading notifications" />;
  if (notifications.isError && !notifications.data) return <ErrorState title="Notifications are unavailable" detail="Aries cannot show or infer notification state until the service responds." onRetry={() => void notifications.refetch()} />;

  const page = notifications.data;
  const filtered = initialFilters.status !== "ALL";
  return <div className="space-y-6">
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-sm font-semibold text-accent">Notifications</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Updates that keep their meaning.</h1><p className="mt-3 max-w-2xl leading-7 text-muted">Completed transaction events and operational alerts from the service, with exact amounts and masked account details.</p></div>
      <div className="flex flex-wrap items-center gap-2"><Button type="button" variant="secondary" onClick={() => void handleMarkAll()} disabled={markAll.isPending || (unread.data ?? 0) === 0}>{markAll.isPending ? "Marking…" : "Mark all as read"}</Button><Button type="button" variant="ghost" aria-label="Refresh notifications" onClick={() => void notifications.refetch()} disabled={notifications.isFetching}><RefreshCw aria-hidden="true" size={17} className={notifications.isFetching ? "animate-spin" : ""} /></Button></div>
    </header>
    <div className="flex items-center justify-between gap-4 overflow-x-auto"><Tabs label="Notification read status" value={initialFilters.status} onValueChange={value => update({ status: value as NotificationFilters["status"], page: 0 })} items={[...statusTabs]} />{unread.data !== undefined && <p className="shrink-0 text-sm text-muted"><span className="font-semibold text-foreground">{unread.data}</span> unread</p>}</div>
    {feedback && <StatusBanner tone={feedback.tone} title={feedback.title}>{feedback.detail}</StatusBanner>}
    {notifications.isError && page && <StatusBanner tone="warning" title="Refresh unavailable">Showing the last confirmed notification page.</StatusBanner>}
    {page?.content.length === 0 ? <EmptyState title={filtered ? `No ${initialFilters.status.toLowerCase()} notifications` : "No notifications yet"} detail={filtered ? "Choose another read-status filter to continue." : "Confirmed transaction events and operational alerts will appear here when available."} /> : page && <section aria-label="Notification results" className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="divide-y divide-border">{page.content.map(notification => <NotificationItem key={notification.id} notification={notification} marking={markOne.isPending && markOne.variables === notification.id} onMarkRead={handleMarkRead} />)}</div>
      <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted">Page {page.page + 1} of {Math.max(page.totalPages, 1)} · {page.totalElements} notifications</p><div className="flex gap-2"><Button variant="secondary" disabled={page.first} onClick={() => update({ page: Math.max(0, page.page - 1) })}>Previous</Button><Button variant="secondary" disabled={page.last} onClick={() => update({ page: page.page + 1 })}>Next</Button></div></div>
    </section>}
  </div>;
}

function NotificationItem({ notification, marking, onMarkRead }: { notification: NotificationRecord; marking: boolean; onMarkRead: (id: string) => Promise<void> }) {
  const unread = notification.readAt === null;
  const Icon = notification.type === "TRANSFER_COMPLETED"
    ? notification.data?.kind === "transaction" && notification.data.direction === "INCOMING" ? ArrowDownLeft : ArrowUpRight
    : notification.type === "REVERSAL_COMPLETED" || notification.type === "REFUND_COMPLETED" ? Repeat2
      : notification.type === "WEBHOOK_DELIVERY_DEAD_LETTERED" ? Webhook : BellRing;

  return <article className={`relative grid gap-4 p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start ${unread ? "bg-[color-mix(in_srgb,var(--aries-accent)_5%,white)]" : ""}`}>
    {unread && <span aria-hidden="true" className="absolute bottom-5 left-0 top-5 w-0.5 rounded-full bg-accent" />}
    <div className={`grid size-10 place-items-center rounded-xl ${unread ? "bg-[color-mix(in_srgb,var(--aries-accent)_14%,white)] text-accent-foreground" : "bg-surface-muted text-muted"}`}><Icon aria-hidden="true" size={18} /></div>
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{notification.title}</h2>{unread && <Badge>Unread</Badge>}</div><p className="mt-2 text-sm leading-6 text-muted">{notification.message}</p><NotificationDetails notification={notification} /><p className="mt-3 text-xs text-muted"><time dateTime={notification.occurredAt}>{formatNotificationDate(notification.occurredAt)}</time></p></div>
    <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">{notification.data?.kind === "transaction" && <Link href={`/transactions?transactionId=${encodeURIComponent(notification.data.transactionId)}` as Route} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-accent hover:bg-surface-muted">View transaction <ArrowRight aria-hidden="true" size={15} /></Link>}{unread && <Button type="button" variant="ghost" onClick={() => void onMarkRead(notification.id)} disabled={marking}>{marking ? "Marking…" : "Mark as read"}</Button>}</div>
  </article>;
}

function NotificationDetails({ notification }: { notification: NotificationRecord }) {
  const details = notification.data;
  if (!details) return <p className="mt-3 text-xs font-medium text-[var(--aries-warning)]">Additional details unavailable</p>;
  if (details.kind === "transaction") return <dl className="mt-4 grid gap-3 rounded-xl bg-surface-muted p-4 text-xs sm:grid-cols-3"><Detail label="Amount" value={formatMoney(details.amount, details.currency)} mono /><Detail label="Direction" value={directionLabel(details.direction)} /><Detail label="Accounts" value={`${details.fromAccountDisplay} → ${details.toAccountDisplay}`} mono /></dl>;
  if (details.kind === "webhook-endpoint") return <dl className="mt-4 grid gap-3 rounded-xl bg-surface-muted p-4 text-xs sm:grid-cols-2"><Detail label="Endpoint" value={details.endpointName} /><Detail label="Host" value={details.host} mono /></dl>;
  return <dl className="mt-4 grid gap-3 rounded-xl bg-surface-muted p-4 text-xs sm:grid-cols-3"><Detail label="Endpoint" value={details.endpointName} /><Detail label="Host" value={details.host} mono /><Detail label="Attempts" value={String(details.attemptCount)} mono />{details.errorCode && <Detail label="Error code" value={details.errorCode} mono />}</dl>;
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><dt className="text-muted">{label}</dt><dd className={`mt-1 break-all font-semibold ${mono ? "font-mono" : ""}`}>{value}</dd></div>;
}
