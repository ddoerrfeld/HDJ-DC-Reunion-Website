import { createHmac, timingSafeEqual } from "node:crypto";
import { getPublicSettings } from "@/lib/data/settings";
import { sendEmail } from "@/lib/email/send";
import { classmateApprovedEmail, classmateReviewEmail } from "@/lib/email/templates";
import { SITE_URL } from "@/lib/site";
import { serviceDb } from "@/lib/supabase/admin";
import { findClassmate, rosterLoaded, type NameToMatch } from "./match";

export type ClassmateStatus = "matched" | "pending" | "approved";

// Generated Supabase types mark every SQL function argument non-null; rsvp_set_classmate accepts null.
const noClassmate = null as unknown as string;

const SCHOOL_LABEL: Record<string, string> = { crown: "Irving Crown", jacobs: "Harry D. Jacobs", other: "Other / attended both" };

/** Approval links are signed per attendee, so only the organizer's email can approve. */
function approvalSignature(attendeeId: string): string {
  const secret = process.env.SITE_GATE_SECRET ?? "";
  if (secret.length < 32) throw new Error("SITE_GATE_SECRET is not configured.");
  return createHmac("sha256", secret).update(`classmate-approve:${attendeeId}`).digest("base64url");
}

export function approvalUrl(attendeeId: string): string {
  return `${SITE_URL}/rsvp/approve/${attendeeId}?s=${approvalSignature(attendeeId)}`;
}

export function validApprovalSignature(attendeeId: string, signature: string | undefined): boolean {
  if (!signature || !/^[0-9a-f-]{36}$/.test(attendeeId)) return false;
  const expected = Buffer.from(approvalSignature(attendeeId));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Runs the classmate check for a saved RSVP and records the result. With no
 * roster loaded yet, everyone is approved (nobody is held for review).
 * Returns the resulting status; notifies the organizer when newly pending.
 */
export async function checkClassmate(
  attendeeId: string,
  person: NameToMatch & { email: string; city?: string | null; gradSchool: string },
  previous: ClassmateStatus | null,
): Promise<ClassmateStatus> {
  const db = serviceDb();
  if (!db) return "approved";
  if (previous === "approved" || previous === "matched") {
    // Already verified: a later name edit never revokes it.
    return previous;
  }
  let status: ClassmateStatus = "approved";
  let classmateId: string | null = null;
  if (await rosterLoaded()) {
    const match = await findClassmate(person);
    status = match ? "matched" : "pending";
    classmateId = match?.id ?? null;
  }
  const { error } = await db.rpc("rsvp_set_classmate", { p_attendee_id: attendeeId, p_status: status, p_classmate_id: classmateId ?? noClassmate });
  if (error) throw new Error(`Failed to record classmate check: ${error.message}`);

  if (status === "pending" && previous !== "pending") {
    const { organizerContactEmail } = await getPublicSettings();
    if (organizerContactEmail) {
      const message = classmateReviewEmail({
        name: [person.firstName, person.nickname ? `“${person.nickname}”` : null, person.hsLastName].filter(Boolean).join(" "),
        hsLastName: person.hsLastName,
        school: SCHOOL_LABEL[person.gradSchool] ?? person.gradSchool,
        email: person.email,
        city: person.city ?? null,
        approveUrl: approvalUrl(attendeeId),
      });
      try {
        await sendEmail({ ...message, to: organizerContactEmail, template: "classmate-review", attendeeId, replyTo: person.email });
      } catch (e) {
        console.error("[classmates] review email failed", e);
      }
    }
  }
  return status;
}

/** Organizer approval (from the signed link). Emails the attendee. Idempotent. */
export async function approveClassmate(attendeeId: string): Promise<{ firstName: string } | null> {
  const db = serviceDb();
  if (!db) return null;
  const { data: attendee } = await db
    .from("attendees")
    .select("first_name, email, classmate_status, status")
    .eq("id", attendeeId)
    .maybeSingle();
  if (!attendee || attendee.status !== "active") return null;
  if (attendee.classmate_status === "pending") {
    const { error } = await db.rpc("rsvp_set_classmate", { p_attendee_id: attendeeId, p_status: "approved", p_classmate_id: noClassmate });
    if (error) throw new Error(`Approval failed: ${error.message}`);
    const { organizerContactEmail } = await getPublicSettings();
    try {
      await sendEmail({
        ...classmateApprovedEmail({ firstName: attendee.first_name }),
        to: attendee.email,
        template: "classmate-approved",
        attendeeId,
        replyTo: organizerContactEmail,
      });
    } catch (e) {
      console.error("[classmates] approved email failed", e);
    }
  }
  return { firstName: attendee.first_name };
}
