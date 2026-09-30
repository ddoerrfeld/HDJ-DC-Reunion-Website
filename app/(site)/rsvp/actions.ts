"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getEventItems, type EventItem } from "@/lib/data/events";
import { getRsvpByToken, isPastDeadline, summaryLines, type SavedRsvp } from "@/lib/data/rsvp";
import { getPublicSettings } from "@/lib/data/settings";
import { sendEmail } from "@/lib/email/send";
import { confirmationEmail, editLinkEmail } from "@/lib/email/templates";
import { buildCalendar } from "@/lib/ics";
import { deletePhoto, photoExists } from "@/lib/photos";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  guestNameErrors,
  personErrors,
  PersonSchema,
  SubmissionSchema,
  type Selection,
  type Submission,
} from "@/lib/rsvp/schema";
import { hashEditToken, looksLikeToken, newEditToken, RSVP_COOKIE, RSVP_COOKIE_MAX_AGE } from "@/lib/rsvp/token";
import { SITE_URL } from "@/lib/site";
import { serviceDb } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";

export type ActionResult =
  | { ok: false; step: "about" | "weekend" | "guests" | "review"; fieldErrors: Record<string, string>; formError?: string }
  | { ok: true };

const GENERIC_ERROR = "Something went wrong saving your RSVP. Please try again in a minute.";

function fail(step: Extract<ActionResult, { ok: false }>["step"], fieldErrors: Record<string, string>, formError?: string): ActionResult {
  return { ok: false, step, fieldErrors, formError };
}

/** Server-side re-validation of everything the browser checked, against live event data. */
function validateSelections(selections: Selection[], items: EventItem[]): ActionResult | null {
  if (selections.length === 0) {
    return fail("weekend", { weekend: "Please choose at least one event." });
  }
  const groups = new Set<string>();
  for (const sel of selections) {
    const item = items.find((i) => i.slug === sel.slug);
    if (!item) return fail("weekend", { weekend: "One of the events you chose is no longer available. Please review your choices." });
    if (item.choiceGroup) {
      if (groups.has(item.choiceGroup)) return fail("weekend", { weekend: "Please choose only one event per time slot." });
      groups.add(item.choiceGroup);
    }
  }
  const guestErrors = guestNameErrors(selections, items);
  return Object.keys(guestErrors).length ? fail("guests", guestErrors) : null;
}

function toDbPayload(data: Submission, selections: Selection[], items: EventItem[]) {
  const { person } = data;
  return {
    person: {
      firstName: person.firstName,
      hsLastName: person.hsLastName,
      currentLastName: person.nameChanged ? person.currentLastName : "",
      nickname: person.nickname,
      email: person.email,
      phone: person.phone,
      city: person.city,
      state: person.state,
      gradSchool: person.gradSchool,
    },
    photoPath: data.photoPath ?? "",
    showInDirectory: data.showInDirectory,
    selections: selections.map((sel) => {
      const item = items.find((i) => i.slug === sel.slug)!;
      const guests = item.allowsGuests ? sel.guests : 0;
      return {
        slug: sel.slug,
        guests,
        halftime: item.halftimeEligible && sel.halftime,
        guestNames: sel.guestNames.slice(0, guests),
      };
    }),
  };
}

async function setRsvpCookie(token: string) {
  (await cookies()).set(RSVP_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: RSVP_COOKIE_MAX_AGE,
  });
}

async function sendConfirmation(saved: SavedRsvp, token: string, items: EventItem[], updated: boolean) {
  const lines = summaryLines(saved.registrations, items);
  const { organizerContactEmail } = await getPublicSettings();
  const email = confirmationEmail({
    firstName: saved.person.firstName,
    editUrl: `${SITE_URL}/rsvp/edit/${token}`,
    lines,
    updated,
  });
  const timed = items.filter((i) => i.startsAt && saved.registrations.some((r) => r.slug === i.slug && r.status !== "waitlist"));
  await sendEmail({
    ...email,
    to: saved.person.email,
    template: updated ? "rsvp-updated" : "rsvp-confirmation",
    attendeeId: saved.attendeeId,
    replyTo: organizerContactEmail,
    attachments: timed.length
      ? [{ filename: "class-of-77-reunion.ics", content: buildCalendar(timed), contentType: "text/calendar" }]
      : [],
  });
}

/** SPEC §7.2 — create a new RSVP. Redirects on success. */
export async function submitRsvp(input: unknown): Promise<ActionResult> {
  const db = serviceDb();
  if (!db) return fail("review", {}, "RSVPs aren’t open yet. Please check back soon.");

  const parsed = SubmissionSchema.safeParse(input);
  if (!parsed.success) {
    const about = PersonSchema.safeParse((input as { person?: unknown } | null)?.person);
    if (!about.success) return fail("about", personErrors(about));
    return fail("review", {}, "Some of your answers couldn’t be read. Please review them and try again.");
  }
  const data = parsed.data;

  const [items, settings] = await Promise.all([getEventItems(), getPublicSettings()]);
  if (isPastDeadline(settings.rsvpDeadline)) return fail("review", {}, "RSVPs are now closed.");
  const invalid = validateSelections(data.selections, items);
  if (invalid) return invalid;

  const ip = clientKey(await headers());
  if (!(await verifyTurnstile(data.turnstileToken, ip))) {
    return fail("review", {}, "We couldn’t confirm you’re not a robot. Please try the check again.");
  }
  if (!(await rateLimit(`rsvp:${ip}`, 10, 60 * 60))) {
    return fail("review", {}, "Too many RSVPs from this connection. Please wait an hour and try again.");
  }
  if (data.photoPath && !(await photoExists(data.photoPath))) {
    return fail("review", {}, "Your photo didn’t finish saving. Please go back to the Photo step and add it again.");
  }

  const { token, hash } = newEditToken();
  const { data: result, error } = await db.rpc("rsvp_create", {
    p: toDbPayload(data, data.selections, items),
    p_token_hash: hash,
  });
  if (error || !result) {
    console.error("[rsvp] create failed", error);
    return fail("review", {}, GENERIC_ERROR);
  }
  const outcome = result as { status: "created" | "duplicate"; attendeeId: string };

  if (outcome.status === "duplicate") {
    // SPEC §7.2: never a second RSVP — send the existing one's (fresh) private link instead.
    if (data.photoPath) await deletePhoto(data.photoPath);
    await sendEditLink(data.person.email, "duplicate");
    redirect("/rsvp/check-email?reason=duplicate");
  }

  const saved = await getRsvpByToken(token);
  let emailFailed = false;
  if (saved) {
    try {
      await sendConfirmation(saved, token, items, false);
    } catch (e) {
      emailFailed = true;
      console.error("[rsvp] confirmation email failed", e);
    }
  }
  await setRsvpCookie(token);
  redirect(emailFailed ? "/rsvp/confirmed?email=failed" : "/rsvp/confirmed");
}

/** SPEC §7.3 — edit via private link. Paid-event changes close at the RSVP deadline. */
export async function updateRsvp(token: string, input: unknown): Promise<ActionResult> {
  const db = serviceDb();
  if (!db || !looksLikeToken(token)) return fail("review", {}, "This link isn’t valid. Please request a new one.");

  const existing = await getRsvpByToken(token);
  if (!existing) return fail("review", {}, "This link isn’t valid anymore. Please request a new one.");

  const parsed = SubmissionSchema.safeParse(input);
  if (!parsed.success) {
    const about = PersonSchema.safeParse((input as { person?: unknown } | null)?.person);
    if (!about.success) return fail("about", personErrors(about));
    return fail("review", {}, "Some of your answers couldn’t be read. Please review them and try again.");
  }
  const data = parsed.data;
  const [items, settings] = await Promise.all([getEventItems(), getPublicSettings()]);

  let selections = data.selections;
  if (isPastDeadline(settings.rsvpDeadline)) {
    // After the deadline: paid events stay exactly as they were; free events may still change.
    const paid = new Set(items.filter((i) => i.requiresPayment).map((i) => i.slug));
    selections = [
      ...selections.filter((s) => !paid.has(s.slug)),
      ...existing.registrations.filter((r) => paid.has(r.slug)).map(({ slug, guests, halftime, guestNames }) => ({ slug, guests, halftime, guestNames })),
    ];
  }
  const invalid = validateSelections(selections, items);
  if (invalid) return invalid;

  if (data.photoPath && data.photoPath !== existing.photoPath && !(await photoExists(data.photoPath))) {
    return fail("review", {}, "Your new photo didn’t finish saving. Please go back to the Photo step and add it again.");
  }

  const { data: result, error } = await db.rpc("rsvp_update", {
    p_token_hash: hashEditToken(token),
    p: toDbPayload(data, selections, items),
  });
  if (error) {
    if (error.code === "23505") {
      return fail("about", { email: "Another classmate’s RSVP already uses that email address." });
    }
    console.error("[rsvp] update failed", error);
    return fail("review", {}, GENERIC_ERROR);
  }
  const previousPhoto = (result as { previousPhotoPath: string | null }).previousPhotoPath;
  if (previousPhoto && previousPhoto !== data.photoPath) await deletePhoto(previousPhoto);

  const saved = await getRsvpByToken(token);
  let emailFailed = false;
  if (saved) {
    try {
      await sendConfirmation(saved, token, items, true);
    } catch (e) {
      emailFailed = true;
      console.error("[rsvp] update email failed", e);
    }
  }
  await setRsvpCookie(token);
  redirect(`/rsvp/confirmed?updated=1${emailFailed ? "&email=failed" : ""}`);
}

/** SPEC §12.2 — "Delete my RSVP": personal data and photo removed; payment records kept anonymized. */
export async function deleteRsvp(token: string): Promise<void> {
  const db = serviceDb();
  if (!db || !looksLikeToken(token)) redirect("/rsvp/lost");
  const { data, error } = await db.rpc("rsvp_delete", { p_token_hash: hashEditToken(token) });
  if (error) {
    console.error("[rsvp] delete failed", error);
    redirect(`/rsvp/edit/${token}?error=delete`);
  }
  const removed = data as { photoPath: string | null };
  await deletePhoto(removed.photoPath);
  (await cookies()).delete(RSVP_COOKIE);
  redirect("/rsvp/deleted");
}

async function sendEditLink(email: string, reason: "lost" | "duplicate") {
  const db = serviceDb();
  if (!db) return;
  const { token, hash } = newEditToken();
  const { data } = await db.rpc("rsvp_rotate_token", { p_email: email, p_new_hash: hash });
  const found = data as { attendeeId: string; firstName: string; email: string } | null;
  if (!found) return;
  const message = editLinkEmail({ firstName: found.firstName, editUrl: `${SITE_URL}/rsvp/edit/${token}`, reason });
  const { organizerContactEmail } = await getPublicSettings();
  try {
    await sendEmail({ ...message, to: found.email, template: "edit-link", attendeeId: found.attendeeId, replyTo: organizerContactEmail });
  } catch (e) {
    console.error("[rsvp] edit-link email failed", e);
  }
}

/** "Lost your link?" (SPEC §7.3): rate-limited, and the response never reveals whether the email exists. */
export async function requestEditLink(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || email.length > 254 || !email.includes("@")) redirect("/rsvp/lost?error=email");
  const ip = clientKey(await headers());
  const allowed = (await rateLimit(`lost:${ip}`, 5, 15 * 60)) && (await rateLimit(`lost-email:${email}`, 3, 60 * 60));
  if (allowed) await sendEditLink(email, "lost");
  redirect("/rsvp/check-email?reason=lost");
}
