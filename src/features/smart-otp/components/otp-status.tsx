"use client";
import { useQuery } from "@tanstack/react-query";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { readOtpStatus, otpError } from "../api";
import { Button } from "@/components/ui/button";
import { useCooldown } from "@/features/auth/use-security-operation";
import { ApiError } from "@/lib/api/errors";

export function OtpStatusPanel() {
  const session = useAuthSession(); const cooldown = useCooldown();
  const query = useQuery({ queryKey: ["smart-otp-status", session.user?.id], queryFn: async () => { try { return await readOtpStatus(session.request); } catch (error) { if (error instanceof ApiError && error.retryAfterSeconds) cooldown.start(error.retryAfterSeconds); throw error; } }, enabled: Boolean(session.user), retry: false, refetchOnWindowFocus: false });
  async function refresh() { const result = await query.refetch(); if (result.error instanceof ApiError && result.error.retryAfterSeconds) cooldown.start(result.error.retryAfterSeconds); }
  return <section aria-labelledby="smart-otp-title" className="space-y-4 rounded-2xl border border-border bg-surface p-6 lg:p-8">
    <h2 id="smart-otp-title" className="text-xl font-semibold">Smart OTP</h2>
    <p className="text-sm text-muted">Approve transfers using your Aries app. Set up, replace, or recover your device in the app.</p>
    {query.data && <dl className="space-y-2 text-sm"><div><dt className="text-muted">Service mode</dt><dd>{query.data.mode === "ENFORCED" ? "Required for transfers to another owner" : query.data.mode === "ENROLLMENT_ONLY" ? "Enrollment available" : "Unavailable"}</dd></div><div><dt className="text-muted">Device status</dt><dd>{({ ACTIVE: "Active device", NOT_ENROLLED: "Not enrolled", RECOVERY_REQUIRED: "Recovery required", UNAVAILABLE: "Unavailable" })[query.data.enrollmentState]}</dd></div></dl>}
    {query.isPending && <p role="status">Loading Smart OTP status…</p>}
    {query.error && <p role="alert">{otpError(query.error)}</p>}
    <Button type="button" variant="secondary" disabled={query.isFetching || cooldown.seconds > 0} onClick={() => void refresh()}>{cooldown.seconds ? `Try again in ${cooldown.seconds}s` : "Refresh Smart OTP status"}</Button>
  </section>;
}
