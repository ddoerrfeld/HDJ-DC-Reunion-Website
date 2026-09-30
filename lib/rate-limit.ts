/**
 * Best-effort, per-instance fixed-window limiter.
 *
 * Known limitation (flagged to owner): serverless platforms run many instances,
 * so counts are not shared between them. This slows casual guessing only.
 * Phase 8 replaces it with a Postgres-backed limiter (SPEC §12.2).
 */
interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

export function isRateLimited(key: string, limit: number, now = Date.now()): boolean {
  const current = windows.get(key);
  return current !== undefined && current.resetAt > now && current.count >= limit;
}

export function recordAttempt(key: string, windowMs: number, now = Date.now()): void {
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    current.count += 1;
  }
  if (windows.size > 10_000) {
    for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
  }
}

export function clientKey(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
