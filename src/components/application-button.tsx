"use client";
import { Localized } from "@/components/localized";

import { useRef, useState } from "react";
import { trackClient } from "@/lib/client-analytics";

export function ApplicationButton({ matchId }: { matchId: string }) {
  const pending = useRef(false);
  const requestId = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function openApplication() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch(`/api/agent/matches/${matchId}/application`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: requestId.current }) });
      const data = await response.json();
      if (response.status === 402) { window.location.assign("/subscribe"); return; }
      if (response.status === 401) { window.location.assign("/auth?next=/agent"); return; }
      if (!response.ok) throw new Error(data.error ?? "Application unavailable");
      requestId.current = null;
      try { trackClient("hot_lead_opened", { matchId, channel: "platform" }); } catch {}
      window.location.assign(data.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Please try again.");
    } finally { pending.current = false; setBusy(false); }
  }
  return <Localized><><button type="button" className="button mt-4" disabled={busy} onClick={openApplication}>{busy ? "Opening…" : "Try this application ↗"}</button>{error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</></Localized>;
}
