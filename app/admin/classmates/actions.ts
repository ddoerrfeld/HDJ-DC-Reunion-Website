"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { refreshSite, str, UUID_RE } from "@/lib/admin/util";
import { recheckPending } from "@/lib/classmates/review";
import { isYearbookSchool } from "@/lib/data/yearbooks";
import { requireServiceDb } from "@/lib/supabase/admin";

function backTo(form: FormData): string {
  const q = str(form, "q");
  const letter = str(form, "letter");
  return `/admin/classmates?${q ? `q=${encodeURIComponent(q)}&` : letter ? `letter=${encodeURIComponent(letter)}&` : ""}`;
}
const fail = (form: FormData, message: string): never => redirect(`${backTo(form)}error=${encodeURIComponent(message)}`);

/** After any change, RSVPs still waiting are checked again; the result is part of the message. */
async function done(form: FormData, what: string): Promise<never> {
  const confirmed = await recheckPending();
  if (confirmed) refreshSite();
  const extra = confirmed ? ` ${confirmed} waiting ${confirmed === 1 ? "RSVP now matches and was" : "RSVPs now match and were"} confirmed (and emailed).` : "";
  redirect(`${backTo(form)}ok=${encodeURIComponent(`${what}${extra}`)}`);
}

function fields(form: FormData) {
  const first = str(form, "first_name").replace(/\s+/g, " ");
  const last = str(form, "last_name").replace(/\s+/g, " ");
  const school = str(form, "school");
  if (!first || !last) fail(form, "Please enter a first and last name.");
  if (!isYearbookSchool(school)) fail(form, "Please choose a school.");
  return { first_name: first, last_name: last, school: school as "crown" | "jacobs" };
}

export async function addClassmate(form: FormData): Promise<void> {
  await requireAdmin();
  const row = fields(form);
  const { error } = await requireServiceDb().from("classmates").insert({ ...row, source: "manual" });
  if (error) fail(form, error.code === "23505" ? "That name is already on the list." : error.message);
  await done(form, `Added ${row.first_name} ${row.last_name}.`);
}

/** Corrects the spelling (or school) of a name read from the yearbook. */
export async function updateClassmate(form: FormData): Promise<void> {
  await requireAdmin();
  const id = str(form, "id");
  if (!UUID_RE.test(id)) fail(form, "Unknown name.");
  const row = fields(form);
  const { error } = await requireServiceDb().from("classmates").update({ ...row, source: "manual" }).eq("id", id);
  if (error) fail(form, error.code === "23505" ? "That name is already on the list." : error.message);
  await done(form, `Saved ${row.first_name} ${row.last_name}.`);
}

export async function removeClassmate(form: FormData): Promise<void> {
  await requireAdmin();
  const id = str(form, "id");
  if (UUID_RE.test(id)) await requireServiceDb().from("classmates").delete().eq("id", id);
  redirect(`${backTo(form)}ok=deleted`);
}
