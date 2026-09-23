"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function QrImage({ payload, label, downloadable = false }: { payload: string; label: string; downloadable?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    let active = true;
    import("qrcode").then(async qr => {
      if (!active || !canvas.current) return;
      await qr.toCanvas(canvas.current, payload, { width: 256, margin: 4, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
      if (active) setReady(true);
    }).catch(() => { if (active) setFeedback("The QR image could not be rendered. You can still copy its contents."); });
    return () => { active = false; };
  }, [payload]);
  async function copy() {
    try { await navigator.clipboard.writeText(payload); setFeedback("Copied."); }
    catch { setFeedback("Copy is unavailable. Select and copy the code below."); }
  }
  function download() {
    if (!canvas.current || !ready) return;
    const link = document.createElement("a"); link.href = canvas.current.toDataURL("image/png"); link.download = "aries-payment-qr.png"; link.click();
  }
  return <figure className="space-y-3">
    <canvas ref={canvas} role="img" aria-label={label} className="h-64 w-64 max-w-full rounded-lg bg-white" />
    <figcaption className="space-y-2"><p className="text-sm font-medium">{label}</p><p className="break-all font-mono text-xs text-muted select-all">{payload}</p></figcaption>
    <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => void copy()}>Copy code</Button>{downloadable && <Button type="button" variant="secondary" disabled={!ready} onClick={download}>Download PNG</Button>}</div>
    {feedback && <p role="status" className="text-sm text-muted">{feedback}</p>}
  </figure>;
}
