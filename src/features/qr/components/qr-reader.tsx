"use client";
import { useEffect, useRef, useState } from "react";
import type QrScanner from "qr-scanner";
import { useMutation } from "@tanstack/react-query";
import { useAuthSession } from "@/features/auth/components/auth-session-provider";
import { useCooldown } from "@/features/auth/use-security-operation";
import { resolveQr, qrError, type ResolvedQr } from "../api";
import { ApiError } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function QrReader({ onResolved }: { onResolved: (qr: ResolvedQr) => void }) {
  const session = useAuthSession(); const cooldown = useCooldown();
  const [payload, setPayload] = useState(""); const [message, setMessage] = useState("");
  const [camera, setCamera] = useState(false); const [working, setWorking] = useState(false);
  const video = useRef<HTMLVideoElement>(null); const scanner = useRef<QrScanner | null>(null);
  const generation = useRef(0); const locked = useRef(false); const cameraStarting = useRef(false);
  const mutation = useMutation({ mutationFn: (value: string) => resolveQr(session.request, value), retry: false, networkMode: "always", gcTime: 0 });
  function stop() { generation.current++; scanner.current?.destroy(); scanner.current = null; cameraStarting.current = false; setCamera(false); }
  useEffect(() => () => { generation.current++; scanner.current?.destroy(); }, []);
  async function resolve(value: string) {
    if (locked.current || cooldown.seconds) return;
    stop(); const epoch = generation.current; locked.current = true; setWorking(true); setMessage("");
    try { const result = await mutation.mutateAsync(value); if (epoch === generation.current) onResolved(result); }
    catch (error) { if (epoch === generation.current) { setMessage(qrError(error)); if (error instanceof ApiError && error.retryAfterSeconds) cooldown.start(error.retryAfterSeconds); } }
    finally { if (epoch === generation.current) { locked.current = false; setWorking(false); } }
  }
  async function start() {
    if (locked.current || cameraStarting.current || cooldown.seconds) return;
    cameraStarting.current = true; setCamera(true); setMessage(""); const epoch = ++generation.current;
    try {
      const Scanner = (await import("qr-scanner")).default;
      if (epoch !== generation.current || !video.current) return;
      const instance = new Scanner(video.current, result => { void resolve(result.data); }, { preferredCamera: "environment", maxScansPerSecond: 5, returnDetailedScanResult: true });
      scanner.current = instance; await instance.start();
      if (epoch !== generation.current) instance.destroy();
    } catch { if (epoch === generation.current) { stop(); setMessage("Camera access is unavailable. Allow camera access on HTTPS, or upload an image or paste the code."); } }
    finally { cameraStarting.current = false; }
  }
  async function scanImage(file: File | undefined) {
    if (!file || locked.current || cooldown.seconds) return;
    stop(); const epoch = generation.current; setMessage(""); locked.current = true; setWorking(true);
    try {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error();
      const Scanner = (await import("qr-scanner")).default;
      const result = await Scanner.scanImage(file, { returnDetailedScanResult: true });
      if (epoch !== generation.current) return;
      locked.current = false; await resolve(result.data);
    } catch { if (epoch === generation.current) setMessage("No readable QR was found. Use a PNG, JPEG or WebP image up to 10 MB, or paste the code."); }
    finally { if (epoch === generation.current) { locked.current = false; setWorking(false); } }
  }
  return <section aria-labelledby="scan-payment-title" className="space-y-5 rounded-2xl border border-border bg-surface p-6">
    <h2 id="scan-payment-title" className="text-xl font-semibold">Pay an Aries QR</h2>
    <p className="text-sm text-muted">Scan or import a payment QR, then review the recipient and amount. Scanning does not send money.</p>
    <div className="flex flex-wrap gap-3"><Button type="button" disabled={working || cooldown.seconds > 0} variant="secondary" onClick={() => camera ? stop() : void start()}>{camera ? "Stop camera" : "Use camera"}</Button><label className="text-sm font-medium">Upload QR image<Input type="file" accept="image/png,image/jpeg,image/webp" disabled={working || cooldown.seconds > 0} onChange={event => { void scanImage(event.target.files?.[0]); event.target.value = ""; }} /></label></div>
    <video ref={video} muted playsInline aria-label="QR camera preview" hidden={!camera} className="max-h-80 w-full rounded-lg bg-surface-muted" />
    <form className="space-y-3" onSubmit={event => { event.preventDefault(); void resolve(payload); }}><label htmlFor="payment-qr-payload" className="block text-sm font-medium">Paste payment QR contents</label><Input id="payment-qr-payload" value={payload} maxLength={256} onChange={event => setPayload(event.target.value)} disabled={working || cooldown.seconds > 0} placeholder="aries:pay:v1:…" autoComplete="off" /><Button type="submit" disabled={working || !payload || cooldown.seconds > 0}>{working ? "Reading QR…" : "Read payment QR"}</Button></form>
    {cooldown.seconds > 0 && <p role="status">Try again in {cooldown.seconds}s.</p>}
    {message && <p role="alert" className="text-sm text-[var(--aries-warning)]">{message}</p>}
  </section>;
}
