import { getSiteStage } from "@/lib/site";
import { serviceDb } from "@/lib/supabase/admin";

/**
 * Rate limiting (SPEC §12.2). Backed by Postgres (rate_limit_hit) so counts are
 * shared across every serverless instance. Falls back to a per-instance
 * in-memory window only when the database isn't configured (local preview).
 */

interface Window {
  count: number;
  resetAt: number;
}
const windows = new Map<string, Window>();

function memoryHit(key: string, max: number, windowSeconds: number, now = Date.now()): boolean {
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    if (windows.size > 10_000) for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
    return true;
  }
  current.count += 1;
  return current.count <= max;
}

/** Counts one attempt; returns true when it is allowed, false when over the limit. */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  // Test runs sign in dozens of times from one address; never honored in production.
  if (process.env.DISABLE_RATE_LIMITS === "1" && getSiteStage() !== "production") return true;
  const db = serviceDb();
  if (!db) return memoryHit(key, max, windowSeconds);
  const { data, error } = await db.rpc("rate_limit_hit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    // Fail open on limiter errors so a DB hiccup never blocks a classmate's RSVP; log it.
    console.error("[rate-limit]", error.message);
    return true;
  }
  return data;
}

export function clientKey(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
