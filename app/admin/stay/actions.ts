"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminImageError, deleteAdminImage, storeAdminImage } from "@/lib/admin/images";
import { bool, isHttpUrl, optional, refreshSite, str, UUID_RE } from "@/lib/admin/util";
import { requireServiceDb } from "@/lib/supabase/admin";

export async function saveLodging(form: FormData): Promise<void> {
  await requireAdmin();
  const id = str(form, "id") || null;
  if (id && !UUID_RE.test(id)) redirect("/admin/stay");
  const fail = (m: string): never => redirect(`/admin/stay/${id ?? "new"}?error=${encodeURIComponent(m)}`);
  const name = str(form, "name");
  const address = str(form, "address");
  if (!name || !address) fail("Name and address are required.");
  const bookingUrl = optional(form, "booking_url");
  if (!isHttpUrl(bookingUrl)) fail("The booking link must start with https://");
  const cutoff = optional(form, "cutoff_date");
  if (cutoff && !/^\d{4}-\d{2}-\d{2}$/.test(cutoff)) fail("Please enter the cutoff as a date.");

  const db = requireServiceDb();
  const existing = id ? (await db.from("lodging").select("photo_path").eq("id", id).maybeSingle()).data : null;
  let photoPath = existing?.photo_path ?? null;
  try {
    const uploaded = await storeAdminImage(form.get("photo"), "lodging", { width: 1200, height: 750 });
    if (uploaded || bool(form, "remove_photo")) {
      await deleteAdminImage("lodging", photoPath);
      photoPath = uploaded;
    }
  } catch (e) {
    if (e instanceof AdminImageError) fail(e.message);
    throw e;
  }

  const row = {
    name,
    address,
    phone: optional(form, "phone"),
    is_official_block: bool(form, "is_official_block"),
    group_code: optional(form, "group_code"),
    booking_url: bookingUrl,
    rate_text: optional(form, "rate_text"),
    cutoff_date: cutoff,
    drive_times_md: optional(form, "drive_times_md"),
    notes_md: optional(form, "notes_md"),
    visible: bool(form, "visible"),
    photo_path: photoPath,
  };
  if (id) {
    const { error } = await db.from("lodging").update(row).eq("id", id);
    if (error) fail(error.message);
    refreshSite();
    redirect(`/admin/stay/${id}?ok=saved`);
  }
  const { data: last } = await db.from("lodging").select("sort").order("sort", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await db.from("lodging").insert({ ...row, sort: (last?.sort ?? 0) + 10 }).select("id").single();
  if (error || !data) fail(error?.message ?? "Couldn’t add.");
  refreshSite();
  redirect(`/admin/stay/${data!.id}?ok=created`);
}

export async function deleteLodging(form: FormData): Promise<void> {
  await requireAdmin();
  const id = str(form, "id");
  if (!UUID_RE.test(id)) redirect("/admin/stay");
  const db = requireServiceDb();
  const { data } = await db.from("lodging").select("photo_path").eq("id", id).maybeSingle();
  await db.from("lodging").delete().eq("id", id);
  await deleteAdminImage("lodging", data?.photo_path ?? null);
  refreshSite();
  redirect("/admin/stay?ok=deleted");
}

export async function moveLodging(form: FormData): Promise<void> {
  await requireAdmin();
  const id = str(form, "id");
  const dir = str(form, "dir") === "up" ? -1 : 1;
  const db = requireServiceDb();
  const { data: rows } = await db.from("lodging").select("id").order("sort").order("name");
  const list = rows ?? [];
  const i = list.findIndex((r) => r.id === id);
  if (i >= 0 && i + dir >= 0 && i + dir < list.length) {
    [list[i], list[i + dir]] = [list[i + dir], list[i]];
    for (const [n, r] of list.entries()) await db.from("lodging").update({ sort: (n + 1) * 10 }).eq("id", r.id);
    refreshSite();
  }
  redirect(`/admin/stay?ok=saved#l-${id}`);
}
