import { getPublicSettings } from "@/lib/data/settings";
import { sendEmail } from "@/lib/email/send";
import { editLinkEmail } from "@/lib/email/templates";
import { SITE_URL } from "@/lib/site";
import { serviceDb } from "@/lib/supabase/admin";
import { newEditToken } from "./token";

/**
 * Issues a new private edit link and emails it (only hashes are stored, so an
 * old link can't be resent). Returns false when there is no RSVP for the email.
 * Server-only — deliberately not in a "use server" file, so it is never a
 * client-callable action.
 */
export async function sendEditLink(email: string, reason: "lost" | "duplicate" | "organizer"): Promise<boolean> {
  const db = serviceDb();
  if (!db) return false;
  const { token, hash } = newEditToken();
  const { data } = await db.rpc("rsvp_rotate_token", { p_email: email, p_new_hash: hash });
  const found = data as { attendeeId: string; firstName: string; email: string } | null;
  if (!found) return false;
  const message = editLinkEmail({ firstName: found.firstName, editUrl: `${SITE_URL}/rsvp/edit/${token}`, reason });
  const { organizerContactEmail } = await getPublicSettings();
  try {
    await sendEmail({ ...message, to: found.email, template: "edit-link", attendeeId: found.attendeeId, replyTo: organizerContactEmail });
  } catch (e) {
    console.error("[rsvp] edit-link email failed", e);
    if (reason === "organizer") throw e;
  }
  return true;
}
