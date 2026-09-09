"use client";

import { MailCheck, MailWarning, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ErrorState, StatusBanner } from "@/components/ui/workspace-state";
import { normalizeRole } from "@/features/auth/capabilities";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { useNotificationPreferences, useRequestEmailVerification, useUpdateNotificationPreferences } from "@/features/notifications/queries";
import type { NotificationPreferences } from "@/features/notifications/types";
import { ApiError, userFacingErrorMessage } from "@/lib/api/errors";

type PreferenceDraft = Pick<NotificationPreferences, "transactionEmailEnabled" | "webhookAlertEmailEnabled">;

export function NotificationPreferencesPanel() {
  const session = useAuthSession();
  const role = normalizeRole(session.user?.role);
  const preferences = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const requestVerification = useRequestEmailVerification();
  const [draft, setDraft] = useState<PreferenceDraft | null>(null);
  const [draftVersion, setDraftVersion] = useState<number | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saved, setSaved] = useState(false);
  const [requestAccepted, setRequestAccepted] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1_000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  if (preferences.isPending) return <section aria-labelledby="notifications-settings-title" className="rounded-2xl border border-border bg-surface p-6 lg:p-8"><div role="status" aria-label="Loading notification preferences" className="space-y-4"><div className="h-6 w-56 animate-pulse rounded bg-surface-muted" /><div className="h-28 animate-pulse rounded-xl bg-surface-muted" /></div></section>;
  if (preferences.isError && !preferences.data) return <ErrorState title="Notification settings are unavailable" detail="Aries cannot confirm your email status or preferences." onRetry={() => void preferences.refetch()} />;
  if (!preferences.data) return null;

  const current = preferences.data;
  const effective = draft ?? current;
  const version = draftVersion ?? current.version;
  const hasTransactionPreference = role === "USER" || role === "MERCHANT";
  const hasWebhookPreference = role === "MERCHANT";
  const hasPreferences = hasTransactionPreference || hasWebhookPreference;
  const dirty = effective.transactionEmailEnabled !== current.transactionEmailEnabled || effective.webhookAlertEmailEnabled !== current.webhookAlertEmailEnabled;

  function change(patch: Partial<PreferenceDraft>) {
    setDraft(previous => ({ transactionEmailEnabled: previous?.transactionEmailEnabled ?? current.transactionEmailEnabled, webhookAlertEmailEnabled: previous?.webhookAlertEmailEnabled ?? current.webhookAlertEmailEnabled, ...patch }));
    setDraftVersion(previous => previous ?? current.version);
    setSaved(false);
  }

  async function save() {
    setSaved(false);
    try {
      await updatePreferences.mutateAsync({ ...effective, expectedVersion: version });
      setDraft(null); setDraftVersion(null); setConflict(false); setSaved(true);
    } catch (error) {
      if (error instanceof ApiError && error.kind === "conflict") setConflict(true);
    }
  }

  async function reloadLatest() {
    const result = await preferences.refetch();
    if (!result.data) return;
    setDraft(null); setDraftVersion(null); setConflict(false); setSaved(false);
  }

  async function requestEmail() {
    setRequestAccepted(false);
    try {
      const result = await requestVerification.mutateAsync();
      setRequestAccepted(!result.emailVerified);
    } catch (error) {
      if (error instanceof ApiError && error.kind === "rate_limited" && error.retryAfterSeconds) setCooldown(error.retryAfterSeconds);
    }
  }

  return <section aria-labelledby="notifications-settings-title" className="rounded-2xl border border-border bg-surface p-6 lg:p-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-medium text-accent">Notifications</p><h2 id="notifications-settings-title" className="mt-1 text-xl font-semibold">Email delivery</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">In-app notifications remain available. These preferences control optional email copies only.</p></div><Badge tone={current.emailVerified ? "success" : "warning"}>{current.emailVerified ? <><MailCheck aria-hidden="true" size={13} /> Verified</> : <><MailWarning aria-hidden="true" size={13} /> Unverified</>}</Badge></div>
    {preferences.isError && <div className="mt-5"><StatusBanner tone="warning" title="Refresh unavailable">Showing the last confirmed preferences.</StatusBanner></div>}
    {!current.emailVerified && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold">Verify your email to receive messages</p><p className="mt-1 text-sm leading-6 text-muted">Aries only queues notification email for an active user with a verified address. A verification request is accepted before delivery is confirmed.</p><Button type="button" variant="secondary" className="mt-4" onClick={() => void requestEmail()} disabled={requestVerification.isPending || cooldown > 0}>{requestVerification.isPending ? "Requesting…" : cooldown > 0 ? `Try again in ${cooldown}s` : "Send verification email"}</Button></div>}
    {requestAccepted && <div className="mt-5"><StatusBanner tone="info" title="Verification request accepted">Delivery is queued separately. Check your inbox when the message arrives.</StatusBanner></div>}
    {requestVerification.isError && <div className="mt-5"><StatusBanner tone="warning" title={requestVerification.error instanceof ApiError && requestVerification.error.kind === "rate_limited" ? "Verification requests paused" : "Request not accepted"}>{userFacingErrorMessage(requestVerification.error, "Aries could not accept a verification request. Try again when the service is available.")}</StatusBanner></div>}
    {hasPreferences ? <div className="mt-6 space-y-3">
      {hasTransactionPreference && <PreferenceRow label="Transaction email" description="Email copies for completed transfers, reversals, and refunds." checked={effective.transactionEmailEnabled} onCheckedChange={checked => change({ transactionEmailEnabled: checked })} disabled={updatePreferences.isPending || conflict} />}
      {hasWebhookPreference && <PreferenceRow label="Webhook alert email" description="Email copies when a merchant webhook endpoint or delivery needs attention." checked={effective.webhookAlertEmailEnabled} onCheckedChange={checked => change({ webhookAlertEmailEnabled: checked })} disabled={updatePreferences.isPending || conflict} />}
      <p className="text-xs leading-5 text-muted">Turning a category off cancels eligible queued and failed email deliveries. It does not remove in-app notifications or change transaction state.</p>
      {conflict && <StatusBanner tone="warning" title="Preferences changed elsewhere">Your draft is preserved, but it cannot be saved over a newer version. Load the latest settings and review them again.<Button type="button" variant="secondary" className="mt-3" onClick={() => void reloadLatest()} disabled={preferences.isFetching}><RefreshCw aria-hidden="true" size={15} className={preferences.isFetching ? "animate-spin" : ""} /><span className="ml-2">Load latest settings</span></Button></StatusBanner>}
      {updatePreferences.isError && !conflict && <StatusBanner tone="warning" title="Preferences not updated">{userFacingErrorMessage(updatePreferences.error, "Aries did not confirm a preference change. Review the current settings before trying again.")}</StatusBanner>}
      {saved && <StatusBanner tone="success" title="Preferences updated">The service confirmed your current email choices.</StatusBanner>}
      <div className="flex justify-end"><Button type="button" onClick={() => void save()} disabled={!dirty || updatePreferences.isPending || conflict}>{updatePreferences.isPending ? "Saving…" : "Save email preferences"}</Button></div>
    </div> : <div className="mt-6 rounded-xl bg-surface-muted p-4"><p className="text-sm font-semibold">No email categories are assigned to this role</p><p className="mt-1 text-sm leading-6 text-muted">Operational access does not subscribe staff to customer transaction or merchant webhook email.</p></div>}
  </section>;
}

function PreferenceRow({ label, description, checked, onCheckedChange, disabled }: { label: string; description: string; checked: boolean; onCheckedChange: (checked: boolean) => void; disabled: boolean }) {
  return <label className="flex cursor-pointer items-start justify-between gap-5 rounded-xl border border-border p-4 has-[:disabled]:cursor-not-allowed"><span><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-sm leading-6 text-muted">{description}</span></span><Switch aria-label={label} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} /></label>;
}
