/**
 * Browser side of error monitoring: posts a short description of an error to
 * /api/client-error (see lib/monitoring.ts). Deduplicated and capped per page
 * load so a broken loop can't flood the server.
 */
const sent = new Set<string>();

export function reportClientError(message: string, detail?: string | null): void {
  try {
    if (typeof window === "undefined" || sent.size >= 5 || sent.has(message)) return;
    sent.add(message);
    const body = JSON.stringify({ message: message.slice(0, 500), detail: detail?.slice(0, 2000) ?? null, path: window.location.pathname });
    if (!navigator.sendBeacon?.("/api/client-error", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/client-error", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    // Monitoring must never break the page.
  }
}
