"use client";

import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { formatUserRole } from "@/features/auth/format";

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(parsed);
}

export function SettingsWorkspace() {
  const session = useAuthSession();
  const user = session.user;

  if (!user) return null;

  return <section className="space-y-8" aria-labelledby="settings-title">
    <div><p className="text-sm font-medium text-accent">Settings</p><h1 id="settings-title" className="mt-1 text-3xl font-semibold tracking-tight">Profile and access</h1><p className="mt-3 max-w-2xl text-muted">Review your profile and access details. This information is read-only and cannot be changed here.</p></div>
    <section aria-labelledby="profile-title" className="rounded-2xl border border-border bg-surface p-6 lg:p-8">
      <div><p className="text-sm font-medium text-accent">Profile</p><h2 id="profile-title" className="mt-1 text-xl font-semibold">Your details</h2></div>
      <dl className="mt-6 grid gap-x-8 gap-y-5 text-sm sm:grid-cols-2">
        <InfoItem label="Full name" value={user.fullName} />
        <InfoItem label="Email address" value={user.email} />
        <InfoItem label="Role" value={formatUserRole(user.role)} />
        <InfoItem label="Account status" value={user.isActive ? "Active" : "Inactive"} />
        <InfoItem label="Member since" value={formatDate(user.createdAt)} />
        <InfoItem label="User ID" value={user.id} monospace />
      </dl>
    </section>
    <section aria-labelledby="access-title" className="rounded-2xl border border-dashed border-border bg-surface-muted p-6">
      <h2 id="access-title" className="font-semibold">Access and notifications</h2>
      <p className="mt-2 text-sm leading-6 text-muted">Aries manages your permissions. Notification preferences and session controls are not available yet.</p>
    </section>
  </section>;
}

function InfoItem({ label, value, monospace = false }: Readonly<{ label: string; value: string; monospace?: boolean }>) {
  return <div><dt className="text-muted">{label}</dt><dd className={`mt-1 break-all font-medium ${monospace ? "font-mono text-xs" : ""}`}>{value}</dd></div>;
}
