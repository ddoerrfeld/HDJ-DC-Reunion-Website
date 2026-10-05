import { getPublicSettings } from "@/lib/data/settings";
import { sendEmail } from "@/lib/email/send";
import { siteProblemEmail } from "@/lib/email/templates";
import { rateLimit } from "@/lib/rate-limit";
import { serviceDb } from "@/lib/supabase/admin";

/**
 * Error monitoring (SPEC §14) without a third-party account: server errors
 * (instrumentation.ts) and browser errors (/api/client-error) are recorded in
 * error_log, listed in /admin, and the organizer gets at most one alert email
 * an hour while problems are happening. Never throws.
 */
export interface ErrorReport {
  source: "server" | "client";
  message: string;
  digest?: string | null;
  path?: string | null;
  route?: string | null;
  detail?: string | null;
}

const clip = (v: string | null | undefined, n: number) => (v ? v.slice(0, n) : null);

/** Private links carry secrets in the path; never store them. Query strings are dropped entirely. */
export function redactPath(path: string | null | undefined): string | null {
  if (!path) return null;
  return path
    .split(/[?#]/)[0]
    .replace(/\/rsvp\/edit\/[^/]+/, "/rsvp/edit/[link]")
    .replace(/\/rsvp\/approve\/[^/]+/, "/rsvp/approve/[id]");
}

// Noise that isn't a site problem: browser extensions, aborted navigations, bots.
const IGNORE = [/ResizeObserver loop/i, /chrome-extension:|moz-extension:|safari-extension:/i, /^Script error\.?$/i, /NEXT_(REDIRECT|NOT_FOUND)/, /AbortError/i, /Load failed$/i];

export async function reportError(report: ErrorReport): Promise<void> {
  try {
    if (IGNORE.some((re) => re.test(report.message) || (report.detail ? re.test(report.detail) : false))) return;
    console.error(`[monitor:${report.source}] ${report.path ?? ""} ${report.message}`);
    const db = serviceDb();
    if (!db) return;
    await db.from("error_log").insert({
      source: report.source,
      message: clip(report.message, 500) ?? "Unknown error",
      digest: clip(report.digest, 100),
      path: clip(redactPath(report.path), 300),
      route: clip(report.route, 200),
      detail: clip(report.detail, 2000),
    });
    // One alert an hour at most, however many errors.
    if (!(await rateLimit("monitor:alert", 1, 60 * 60))) return;
    const { organizerContactEmail } = await getPublicSettings();
    if (!organizerContactEmail || !process.env.RESEND_API_KEY) return;
    await sendEmail({ ...siteProblemEmail({ message: clip(report.message, 300)!, path: redactPath(report.path), source: report.source }), to: organizerContactEmail, template: "site-problem" });
  } catch (e) {
    console.error("[monitor] could not record error", e);
  }
}
