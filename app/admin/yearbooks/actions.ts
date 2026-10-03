"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { int, refreshSite, str, UUID_RE } from "@/lib/admin/util";
import { isYearbookSchool } from "@/lib/data/yearbooks";
import { requireServiceDb } from "@/lib/supabase/admin";

function school(form: FormData) {
  const s = str(form, "school");
  if (!isYearbookSchool(s)) redirect("/admin/yearbooks");
  return s;
}
const back = (s: string, params: string, hash = ""): never => redirect(`/admin/yearbooks?book=${s}&${params}${hash}`);

export async function saveBook(form: FormData): Promise<void> {
  await requireAdmin();
  const s = school(form);
  const title = str(form, "title");
  const start = int(form, "seniors_start");
  const end = int(form, "seniors_end");
  if (!title) back(s, `error=${encodeURIComponent("Please give the book a title.")}`);
  if (Number.isNaN(start) || Number.isNaN(end) || (start !== null && end !== null && end < start)) {
    back(s, `error=${encodeURIComponent("The seniors pages must be file numbers, with the last one after the first.")}`);
  }
  const { error } = await requireServiceDb().from("yearbook_books").update({ title, seniors_start_seq: start, seniors_end_seq: end }).eq("school", s);
  if (error) back(s, `error=${encodeURIComponent(error.message)}`);
  refreshSite();
  back(s, "ok=saved");
}

/** Saves every page's printed label and hidden flag in one go. */
export async function savePages(form: FormData): Promise<void> {
  await requireAdmin();
  const s = school(form);
  const ids = str(form, "ids").split(",").filter((id) => UUID_RE.test(id));
  const db = requireServiceDb();
  const { data: current } = await db.from("yearbook_pages").select("id, page_label, hidden").eq("school", s);
  const before = new Map((current ?? []).map((p) => [p.id, p]));
  for (const id of ids) {
    const was = before.get(id);
    if (!was) continue;
    const label = str(form, `label-${id}`).slice(0, 60) || null;
    const hidden = form.get(`hidden-${id}`) === "on";
    if (label === was.page_label && hidden === was.hidden) continue;
    const { error } = await db.from("yearbook_pages").update({ page_label: label, hidden }).eq("id", id);
    if (error) back(s, `error=${encodeURIComponent(error.message)}`, "#pages");
  }
  refreshSite();
  back(s, "ok=saved", "#pages");
}

export async function addClassmate(form: FormData): Promise<void> {
  await requireAdmin();
  const s = school(form);
  const first = str(form, "first_name");
  const last = str(form, "last_name");
  if (!first || !last) back(s, `error=${encodeURIComponent("Please enter a first and last name.")}`, "#roster");
  const { error } = await requireServiceDb().from("classmates").insert({ school: s, first_name: first, last_name: last, source: "manual" });
  if (error) back(s, `error=${encodeURIComponent(error.code === "23505" ? "That name is already on the list." : error.message)}`, "#roster");
  back(s, "ok=created", "#roster");
}

export async function removeClassmate(form: FormData): Promise<void> {
  await requireAdmin();
  const s = school(form);
  const id = str(form, "id");
  if (UUID_RE.test(id)) await requireServiceDb().from("classmates").delete().eq("id", id).eq("school", s);
  back(s, "ok=deleted", "#roster");
}
