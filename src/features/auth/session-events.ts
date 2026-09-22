const channelName = "aries-session-events";
const storageKey = "aries:session-event";
type SessionEvent = { type: "session-ended"; id: string };

function isSessionEvent(value: unknown): value is SessionEvent {
  return typeof value === "object" && value !== null && "type" in value && value.type === "session-ended" && "id" in value && typeof value.id === "string";
}

/** Signals contain no credentials or identity. Receivers verify their own access. */
export function connectSessionEvents(onEvent: () => void) {
  let channel: BroadcastChannel | null = null;
  try { if (typeof BroadcastChannel !== "undefined") channel = new BroadcastChannel(channelName); } catch { /* Storage fallback below. */ }
  const receive = (event: MessageEvent<unknown>) => { if (isSessionEvent(event.data)) onEvent(); };
  const storage = (event: StorageEvent) => {
    if (event.key !== storageKey || !event.newValue) return;
    try { if (isSessionEvent(JSON.parse(event.newValue))) onEvent(); } catch { /* Ignore unrelated/malformed events. */ }
  };
  channel?.addEventListener("message", receive);
  window.addEventListener("storage", storage);
  return {
    publish() {
      const event: SessionEvent = { type: "session-ended", id: crypto.randomUUID() };
      if (channel) { channel.postMessage(event); return; }
      try { localStorage.setItem(storageKey, JSON.stringify(event)); localStorage.removeItem(storageKey); } catch { /* Server-side revocation still applies. */ }
    },
    close() { channel?.close(); window.removeEventListener("storage", storage); },
  };
}
