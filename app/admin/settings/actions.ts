"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { fromChicago } from "@/lib/admin/time";
import { bool, optional, refreshSite, str } from "@/lib/admin/util";
import type { Json } from "@/lib/supabase/database.types";
import { requireServiceDb } from "@/lib/supabase/admin";

const fail = (message: string): never => redirect(`/admin/settings?error=${encodeURIComponent(message)}`);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function saveSettings(form: FormData): Promise<void> {
  await requireAdmin();
  const deadlineDay = str(form, "deadline_day");
  const deadlineTime = str(form, "deadline_time") || "23:59";
  const deadline = deadlineDay ? fromChicago(deadlineDay, deadlineTime) : null;
  if (deadlineDay && !deadline) fail("Please enter the RSVP deadline as a date.");
  const cutoff = optional(form, "refund_cutoff_date");
  if (cutoff && !/^\d{4}-\d{2}-\d{2}$/.test(cutoff)) fail("Please enter the refund cutoff as a date.");
  const contact = optional(form, "organizer_contact_email");
  if (contact && !EMAIL.test(contact)) fail("Please enter a valid organizer email address.");

  // settings.value is NOT NULL jsonb and the API turns JSON null into SQL NULL, so "not set" is stored as "" (readers treat blank as unset).
  const values: Record<string, NonNullable<Json>> = {
    rsvp_deadline: deadline ?? "",
    refund_policy_md: optional(form, "refund_policy_md") ?? "",
    refund_cutoff_date: cutoff ?? "",
    organizer_contact_email: contact ?? "",
    faq_md: optional(form, "faq_md") ?? "",
    feature_flags: { in_memoriam: bool(form, "flag_in_memoriam"), faq: bool(form, "flag_faq"), yearbook_ocr: bool(form, "flag_yearbook_ocr") },
    section_gate_enabled: bool(form, "section_gate_enabled"),
  };
  const db = requireServiceDb();
  for (const [key, value] of Object.entries(values)) {
    const { error } = await db.from("settings").update({ value }).eq("key", key);
    if (error) fail(`Couldn’t save ${key}: ${error.message}`);
  }
  refreshSite();
  redirect("/admin/settings?ok=saved");
}

export async function addAdmin(form: FormData): Promise<void> {
  await requireAdmin();
  const email = str(form, "email").toLowerCase();
  if (!EMAIL.test(email)) fail("Please enter a valid email address.");
  const { error } = await requireServiceDb().from("admin_users").upsert({ email });
  if (error) fail(error.message);
  redirect("/admin/settings?ok=created#admins");
}

export async function removeAdmin(form: FormData): Promise<void> {
  const me = await requireAdmin();
  const email = str(form, "email").toLowerCase();
  if (email === me.toLowerCase()) fail("You can’t remove yourself. Ask another organizer to do it.");
  await requireServiceDb().from("admin_users").delete().ilike("email", email);
  redirect("/admin/settings?ok=deleted#admins");
}
