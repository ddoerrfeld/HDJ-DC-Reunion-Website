import { cookies } from "next/headers";
import { createGateToken, GATE_MAX_AGE_SECONDS, verifyGateToken, type GateConfig } from "@/lib/gate";
import { getSiteStage } from "@/lib/site";
import { hashEditToken, looksLikeToken, RSVP_COOKIE } from "@/lib/rsvp/token";
import { serviceDb } from "@/lib/supabase/admin";

/**
 * Section gate for the yearbooks (SPEC §12.1 Stage B), owner-revised: instead of
 * a shared passcode, access comes from being a verified classmate — a matched or
 * approved RSVP, or passing the name check on /yearbooks. The cookie is
 * signed like the site gate cookie, under its own key.
 *
 * Active in production when the `section_gate_enabled` setting is on (default).
 * In preview the site passcode already covers everything (Stage A), but an
 * organizer can try the Stage B experience with the preview cookie below.
 */
export const CLASSMATE_COOKIE = "c77_classmate";
export const PREVIEW_SECTION_GATE_COOKIE = "c77_preview_section_gate";

function classmateConfig(): GateConfig | null {
  const secret = process.env.SITE_GATE_SECRET ?? "";
  return secret.length >= 32 ? { secret, passcode: "classmate-access" } : null;
}

async function sectionGateSetting(): Promise<boolean> {
  const db = serviceDb();
  if (!db) return true; // fail closed
  const { data } = await db.from("settings").select("value").eq("key", "section_gate_enabled").maybeSingle();
  return data?.value !== false;
}

export async function sectionGateActive(): Promise<boolean> {
  if (getSiteStage() !== "production") {
    const jar = await cookies();
    if (jar.get(PREVIEW_SECTION_GATE_COOKIE)?.value !== "1") return false;
  }
  return sectionGateSetting();
}

async function hasClassmateCookie(): Promise<boolean> {
  const config = classmateConfig();
  if (!config) return false;
  return verifyGateToken((await cookies()).get(CLASSMATE_COOKIE)?.value, config);
}

/**
 * This device holds a classmate's RSVP (the edit-link cookie) whose name matched
 * the roster or was approved by the organizer — so an approval takes effect on
 * their devices without any new link.
 */
async function hasVerifiedRsvp(): Promise<boolean> {
  const token = (await cookies()).get(RSVP_COOKIE)?.value;
  const db = serviceDb();
  if (!token || !looksLikeToken(token) || !db) return false;
  const { data } = await db
    .from("attendees")
    .select("classmate_status")
    .eq("edit_token_hash", hashEditToken(token))
    .eq("status", "active")
    .maybeSingle();
  return data?.classmate_status === "matched" || data?.classmate_status === "approved";
}

/** True when the visitor may open the yearbooks right now. */
export async function hasYearbookAccess(): Promise<boolean> {
  if (!(await sectionGateActive())) return true;
  return (await hasClassmateCookie()) || hasVerifiedRsvp();
}

/** Call from a server action or route handler once someone is a verified classmate. */
export async function grantYearbookAccess(): Promise<void> {
  const config = classmateConfig();
  if (!config) return;
  (await cookies()).set(CLASSMATE_COOKIE, await createGateToken(config), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GATE_MAX_AGE_SECONDS,
  });
}
