"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { bool, optional, refreshSite, str, UUID_RE } from "@/lib/admin/util";
import { approveClassmate } from "@/lib/classmates/review";
import { deletePhoto } from "@/lib/photos";
import { sendEditLink } from "@/lib/rsvp/edit-link";
import { requireServiceDb } from "@/lib/supabase/admin";
import { deleteThenPhoto } from "@/lib/yearbook/portrait";

function attendeeId(form: FormData): string {
  const id = str(form, "attendee");
  if (!UUID_RE.test(id)) redirect("/admin/rsvps");
  return id;
}
const back = (id: string, params: string, hash = ""): never => redirect(`/admin/rsvps/${id}?${params}${hash}`);
const failed = (id: string, message: string): never => back(id, `error=${encodeURIComponent(message)}`);

export async function updatePerson(form: FormData): Promise<void> {
  await requireAdmin();
  const id = attendeeId(form);
  const first = str(form, "first_name");
  const hs = str(form, "hs_last_name");
  const email = str(form, "email").toLowerCase();
  const school = str(form, "grad_school");
  if (!first || !hs) failed(id, "First name and high-school last name are required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) failed(id, "Please enter a valid email address.");
  if (!["crown", "jacobs", "other"].includes(school)) failed(id, "Please choose a school.");
  const { error } = await requireServiceDb()
    .from("attendees")
    .update({
      first_name: first,
      hs_last_name: hs,
      current_last_name: optional(form, "current_last_name"),
      nickname: optional(form, "nickname"),
      email,
      phone: optional(form, "phone"),
      city: optional(form, "city"),
      state: optional(form, "state"),
      grad_school: school as "crown" | "jacobs" | "other",
      show_in_directory: bool(form, "show_in_directory"),
    })
    .eq("id", id);
  if (error) failed(id, error.code === "23505" ? "Another RSVP already uses that email address." : `Couldn’t save: ${error.message}`);
  refreshSite();
  back(id, "ok=saved");
}

export async function approve(form: FormData): Promise<void> {
  await requireAdmin();
  const id = attendeeId(form);
  await approveClassmate(id);
  refreshSite();
  back(id, "ok=approved");
}

async function registrationFor(form: FormData, id: string): Promise<string> {
  const reg = str(form, "registration");
  if (!UUID_RE.test(reg)) failed(id, "Unknown sign-up.");
  const { data } = await requireServiceDb().from("registrations").select("id").eq("id", reg).eq("attendee_id", id).maybeSingle();
  if (!data) failed(id, "Unknown sign-up.");
  return reg;
}

export async function setPaid(form: FormData): Promise<void> {
  await requireAdmin();
  const id = attendeeId(form);
  const reg = await registrationFor(form, id);
  await requireServiceDb().from("registrations").update({ paid_at: bool(form, "paid") ? new Date().toISOString() : null }).eq("id", reg);
  back(id, "ok=saved", `#r-${reg}`);
}

/** Confirm someone off the waitlist, or move them to it. */
export async function setRegistrationStatus(form: FormData): Promise<void> {
  await requireAdmin();
  const id = attendeeId(form);
  const reg = await registrationFor(form, id);
  const status = str(form, "status");
  if (status !== "confirmed" && status !== "waitlist") failed(id, "Unknown status.");
  await requireServiceDb().from("registrations").update({ status: status as "confirmed" | "waitlist" }).eq("id", reg);
  refreshSite();
  back(id, "ok=saved", `#r-${reg}`);
}

export async function setHalftime(form: FormData): Promise<void> {
  await requireAdmin();
  const id = attendeeId(form);
  const reg = await registrationFor(form, id);
  await requireServiceDb().from("registrations").update({ halftime_walk: bool(form, "halftime") }).eq("id", reg);
  back(id, "ok=saved", `#r-${reg}`);
}

export async function removeRegistration(form: FormData): Promise<void> {
  await requireAdmin();
  const id = attendeeId(form);
  const reg = await registrationFor(form, id);
  await requireServiceDb().from("registrations").delete().eq("id", reg);
  refreshSite();
  back(id, "ok=saved");
}

export async function resendLink(form: FormData): Promise<void> {
  await requireAdmin();
  const id = attendeeId(form);
  const { data } = await requireServiceDb().from("attendees").select("email").eq("id", id).maybeSingle();
  if (!data) redirect("/admin/rsvps");
  try {
    await sendEditLink(data.email, "organizer");
  } catch {
    failed(id, "The email couldn’t be sent. Please try again in a minute.");
  }
  back(id, "ok=sent");
}

export async function setPhotoHidden(form: FormData): Promise<void> {
  await requireAdmin();
  const id = attendeeId(form);
  await requireServiceDb().from("attendees").update({ photo_hidden: bool(form, "hidden") }).eq("id", id);
  refreshSite();
  const from = str(form, "from");
  if (from === "photos") redirect(`/admin/photos?ok=saved#a-${id}`);
  back(id, "ok=saved");
}

/** Clears the "See Me in ’77" portrait (they can choose again from their edit link). */
export async function clearSeeMe(form: FormData): Promise<void> {
  await requireAdmin();
  const id = attendeeId(form);
  const db = requireServiceDb();
  // rsvp_set_yearbook_photo takes nulls to clear; generated types mark its args non-null.
  const none = null as unknown as string;
  const { data: previous, error } = await db.rpc("rsvp_set_yearbook_photo", { p_attendee_id: id, p_page_id: none, p_crop: none, p_then_path: none });
  if (error) failed(id, error.message);
  await deleteThenPhoto(previous);
  refreshSite();
  const from = str(form, "from");
  if (from === "photos") redirect(`/admin/photos?ok=saved#a-${id}`);
  back(id, "ok=saved");
}

/** Removes the RSVP completely (photos too), as the attendee's own "Delete my RSVP" does. */
export async function deleteAttendee(form: FormData): Promise<void> {
  await requireAdmin();
  const id = attendeeId(form);
  if (str(form, "confirm").toLowerCase() !== "delete") failed(id, "Type DELETE to confirm.");
  const db = requireServiceDb();
  const { data: a } = await db.from("attendees").select("photo_path, then_photo_path").eq("id", id).maybeSingle();
  if (!a) redirect("/admin/rsvps");
  const { error } = await db.from("attendees").delete().eq("id", id);
  if (error) failed(id, error.message);
  await deletePhoto(a.photo_path);
  await deleteThenPhoto(a.then_photo_path);
  refreshSite();
  redirect("/admin/rsvps?ok=deleted");
}
