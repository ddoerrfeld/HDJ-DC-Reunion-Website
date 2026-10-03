"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminImageError, deleteAdminImage, storeAdminImage } from "@/lib/admin/images";
import { bool, optional, refreshSite, str, UUID_RE } from "@/lib/admin/util";
import { requireServiceDb } from "@/lib/supabase/admin";

export async function saveMemorial(form: FormData): Promise<void> {
  await requireAdmin();
  const id = str(form, "id") || null;
  if (id && !UUID_RE.test(id)) redirect("/admin/memoriam");
  const fail = (m: string): never => redirect(`/admin/memoriam/${id ?? "new"}?error=${encodeURIComponent(m)}`);
  const name = str(form, "name");
  const school = str(form, "grad_school");
  if (!name) fail("Please enter a name.");
  if (!["crown", "jacobs", "other"].includes(school)) fail("Please choose a school.");

  const db = requireServiceDb();
  const existing = id ? (await db.from("memoriam").select("photo_path").eq("id", id).maybeSingle()).data : null;
  let photoPath = existing?.photo_path ?? null;
  try {
    const uploaded = await storeAdminImage(form.get("photo"), "memoriam", { width: 480, height: 600 });
    if (uploaded || bool(form, "remove_photo")) {
      await deleteAdminImage("memoriam", photoPath);
      photoPath = uploaded;
    }
  } catch (e) {
    if (e instanceof AdminImageError) fail(e.message);
    throw e;
  }
  const row = { name, grad_school: school as "crown" | "jacobs" | "other", years: optional(form, "years"), note: optional(form, "note"), photo_path: photoPath };
  if (id) {
    const { error } = await db.from("memoriam").update(row).eq("id", id);
    if (error) fail(error.message);
  } else {
    const { data: last } = await db.from("memoriam").select("sort").order("sort", { ascending: false }).limit(1).maybeSingle();
    const { error } = await db.from("memoriam").insert({ ...row, sort: (last?.sort ?? 0) + 10 });
    if (error) fail(error.message);
  }
  refreshSite();
  redirect(`/admin/memoriam?ok=${id ? "saved" : "created"}`);
}

export async function deleteMemorial(form: FormData): Promise<void> {
  await requireAdmin();
  const id = str(form, "id");
  if (!UUID_RE.test(id)) redirect("/admin/memoriam");
  const db = requireServiceDb();
  const { data } = await db.from("memoriam").select("photo_path").eq("id", id).maybeSingle();
  await db.from("memoriam").delete().eq("id", id);
  await deleteAdminImage("memoriam", data?.photo_path ?? null);
  refreshSite();
  redirect("/admin/memoriam?ok=deleted");
}
