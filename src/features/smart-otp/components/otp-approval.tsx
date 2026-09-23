"use client";

import { useEffect, useRef, useState } from "react";
import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { createAuthorization, readAuthorization, verifyAuthorization, otpError, uncertain, type Authorization } from "../api";
import type { TransferPreview } from "@/features/transfers/types";
import { QrImage } from "@/features/qr/components/qr-image";
import { ApiError } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OtpApproval({ preview, idempotencyKey, onConfirm }: { preview: TransferPreview; idempotencyKey: string; onConfirm: (authorizationId: string) => void }) {
  const session = useAuthSession(); const cache = useQueryClient();
  const key = ["smart-otp", session.user?.id, preview.previewId, idempotencyKey] as const;
  const query = useQuery<Authorization>({ queryKey: key, queryFn: skipToken, enabled: false, retry: false, networkMode: "always", gcTime: 0 });
  const challenge = query.data;
  const [otp, setOtp] = useState(""); const code = useRef("");
  const [message, setMessage] = useState(""); const [needsCheck, setNeedsCheck] = useState(false);
  const [blocked, setBlocked] = useState(false); const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(() => Date.now()); const lock = useRef(false); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; const clock = window.setInterval(() => setNow(Date.now()), 1000); return () => { mounted.current = false; code.current = ""; window.clearInterval(clock); }; }, []);
  const operation = useMutation({
    mutationFn: async (action: "create" | "check" | "verify") => {
      if (action === "create") return createAuthorization(session.request, preview.previewId, idempotencyKey);
      if (!challenge) throw new Error("No authorization");
      if (action === "check") return readAuthorization(session.request, challenge.id);
      const value = code.current; code.current = ""; setOtp("");
      return verifyAuthorization(session.request, challenge.id, value);
    }, retry: false, networkMode: "always", gcTime: 0,
  });
  const expiry = Math.min(Date.parse(preview.expiresAt), challenge ? Date.parse(challenge.expiresAt) : Infinity);
  const expired = now >= expiry;
  const terminal = challenge && !["PENDING", "VERIFIED"].includes(challenge.state);
  const cooldown = Math.max(0, Math.ceil((retryAt - now) / 1000));
  async function run(action: "create" | "check" | "verify") {
    if (lock.current || cooldown || expired || blocked || (action === "verify" && (needsCheck || !/^[0-9]{8}$/.test(otp)))) return;
    lock.current = true; setMessage("");
    try {
      const result = await operation.mutateAsync(action);
      if (!mounted.current) return;
      cache.setQueryData(key, result); setNeedsCheck(false);
      if (action === "verify" && result.state === "VERIFIED" && Date.now() < Date.parse(result.expiresAt)) onConfirm(result.id);
    } catch (error) {
      if (!mounted.current) return;
      setMessage(otpError(error));
      if (error instanceof ApiError) {
        if (error.retryAfterSeconds !== null) setRetryAt(Date.now() + error.retryAfterSeconds * 1000);
        if (["SMART_OTP_LOCKED", "SMART_OTP_EXPIRED", "SMART_OTP_DEVICE_REVOKED", "SMART_OTP_BINDING_CONFLICT", "SMART_OTP_NOT_FOUND", "SMART_OTP_CONSUMED"].includes(error.code ?? "")) setBlocked(true);
      }
      if (action === "verify" && uncertain(error)) setNeedsCheck(true);
    } finally { lock.current = false; code.current = ""; if (mounted.current) { setOtp(""); operation.reset(); } }
  }
  if (preview.enrollmentState !== "ACTIVE") return <p role="status" className="text-sm text-[var(--aries-warning)]">{preview.enrollmentState === "RECOVERY_REQUIRED" ? "Recover" : "Set up"} Smart OTP in your Aries app, then create a new transfer preview. No transfer has been sent.</p>;
  return <section aria-label="Smart OTP verification" className="mt-5 space-y-4 border-t border-border pt-5">
    <h3 className="font-semibold">Verify with your Aries app</h3>
    {!challenge ? <><p className="text-sm text-muted">Continue to create a transaction-specific QR for your app. Review the same recipient and amount there.</p><Button type="button" onClick={() => void run("create")} disabled={operation.isPending || cooldown > 0 || expired || blocked}>{operation.isPending ? "Preparing verification…" : "Continue to Smart OTP"}</Button></> : <>
      {!expired && !terminal && !blocked && <QrImage key={challenge.id} payload={challenge.id} label="Scan in Aries to review this transfer" />}
      <p role="status" className="text-sm text-muted">Authorization: {challenge.state.toLowerCase()} · {Math.max(0, Math.ceil((expiry - now) / 1000))}s remaining</p>
      {(expired || terminal || blocked) ? <p role="alert" className="text-sm text-[var(--aries-warning)]">{challenge.state === "CONSUMED" ? "This authorization was already used. Check transaction history before starting another transfer." : "This authorization cannot be used. Edit details and create a new preview, or check your device in the app."}</p> : needsCheck ? <Button type="button" variant="secondary" disabled={operation.isPending || cooldown > 0} onClick={() => void run("check")}>Check verification status</Button> : challenge.state === "VERIFIED" ? <Button type="button" disabled={operation.isPending || cooldown > 0} onClick={() => { if (!lock.current && Date.now() < expiry) { lock.current = true; onConfirm(challenge.id); } }}>Continue verified transfer</Button> : <form className="space-y-3" onSubmit={event => { event.preventDefault(); void run("verify"); }}>
        <label htmlFor="smart-otp-code" className="block text-sm font-medium">Eight-digit Smart OTP</label>
        <Input id="smart-otp-code" value={otp} onChange={event => { const value = event.target.value; if (/^[0-9]{0,8}$/.test(value)) { setOtp(value); code.current = value; } }} inputMode="numeric" autoComplete="off" maxLength={8} disabled={operation.isPending || cooldown > 0} aria-describedby="smart-otp-help" />
        <p id="smart-otp-help" className="text-xs text-muted">Enter the code from your app for this exact transfer. Verifying and sending requests the debit shown above.</p>
        <Button type="submit" disabled={operation.isPending || cooldown > 0 || !/^[0-9]{8}$/.test(otp)}>{operation.isPending ? "Verifying…" : "Verify and transfer"}</Button>
      </form>}
    </>}
    {cooldown > 0 && <p role="status" className="text-sm text-muted">Try again in {cooldown}s.</p>}
    {message && <p role="alert" className="text-sm text-[var(--aries-warning)]">{message}</p>}
  </section>;
}
