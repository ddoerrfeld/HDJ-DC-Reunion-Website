import { reportClientError } from "./lib/client-report";

// Uncaught errors and rejected promises in visitors' browsers (SPEC §14 error monitoring).
window.addEventListener("error", (event) => {
  // Only errors from this site's own scripts; extensions and third-party frames are noise.
  if (event.filename && !event.filename.startsWith(window.location.origin)) return;
  const error = event.error instanceof Error ? event.error : null;
  reportClientError(error?.message || event.message || "Unknown error", error?.stack ?? `${event.filename}:${event.lineno}:${event.colno}`);
});
window.addEventListener("unhandledrejection", (event) => {
  const reason: unknown = event.reason;
  const error = reason instanceof Error ? reason : null;
  reportClientError(error?.message || String(reason).slice(0, 300) || "Unhandled promise rejection", error?.stack ?? null);
});
