"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { fromChicago } from "@/lib/admin/time";
import { bool, dollarsToCents, int, isHttpUrl, optional, refreshSite, str, UUID_RE } from "@/lib/admin/util";
import { requireServiceDb } from "@/lib/supabase/admin";

function back(id: string | null, params: string): never {
  redirect(id ? `/admin/events/${id}?${params}` : `/admin/events/new?${params}`);
}

/** Create or update an event item (every SPEC §6 field). */
export async function saveEvent(form: FormData): Promise<void> {
  await requireAdmin();
  const id = str(form, "id") || null;
  if (id && !UUID_RE.test(id)) redirect("/admin/events");
  const fail = (message: string) => back(id, `error=${encodeURIComponent(message)}`);

  const title = str(form, "title");
  const slug = str(form, "slug").toLowerCase();
  const day = str(form, "day");
  if (!title) fail("Please give the event a title.");
  if (!/^[a-z0-9-]+$/.test(slug)) fail("The short name may use only lowercase letters, numbers and dashes (e.g. reunion-dinner).");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) fail("Please choose the day.");
  const start = str(form, "start");
  const end = str(form, "end");
  const startsAt = start ? fromChicago(day, start) : null;
  const endsAt = end ? fromChicago(day, end) : null;
  if (end && !start) fail("Add a start time, or clear the end time.");
  if (startsAt && endsAt && endsAt <= startsAt) fail("The end time must be after the start time.");
  const requiresPayment = bool(form, "requires_payment");
  const priceCents = dollarsToCents(str(form, "price"));
  if (Number.isNaN(priceCents)) fail("Please enter the price as a number, like 45 or 45.50.");
  const capacity = int(form, "capacity");
  if (capacity !== null && (Number.isNaN(capacity) || capacity < 1)) fail("Capacity must be a whole number above zero, or blank for no limit.");
  const websiteUrl = optional(form, "website_url");
  if (!isHttpUrl(websiteUrl)) fail("The website must start with https://");

  const row = {
    title,
    slug,
    day,
    starts_at: startsAt,
    ends_at: endsAt,
    description_md: str(form, "description_md"),
    location_name: optional(form, "location_name"),
    address: optional(form, "address"),
    address_confirmed: bool(form, "address_confirmed"),
    choice_group: optional(form, "choice_group"),
    requires_payment: requiresPayment,
    price_cents: priceCents,
    allows_guests: bool(form, "allows_guests"),
    capacity,
    confirmed: bool(form, "confirmed"),
    unconfirmed_note: optional(form, "unconfirmed_note"),
    website_url: websiteUrl,
    halftime_eligible: bool(form, "halftime_eligible"),
    visible: bool(form, "visible"),
  };

  const db = requireServiceDb();
  if (id) {
    const { error } = await db.from("event_items").update(row).eq("id", id);
    if (error) fail(error.code === "23505" ? "Another event already uses that short name." : `Couldn’t save: ${error.message}`);
    refreshSite();
    back(id, "ok=saved");
  }
  const { data: last } = await db.from("event_items").select("sort").order("sort", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await db.from("event_items").insert({ ...row, sort: (last?.sort ?? 0) + 10 }).select("id").single();
  if (error || !data) fail(error?.code === "23505" ? "Another event already uses that short name." : `Couldn’t add: ${error?.message}`);
  refreshSite();
  redirect(`/admin/events/${data!.id}?ok=created`);
}

/** Swap with the neighbour on the same day (sort order). */
export async function moveEvent(form: FormData): Promise<void> {
  await requireAdmin();
  const id = str(form, "id");
  const dir = str(form, "dir") === "up" ? -1 : 1;
  const db = requireServiceDb();
  const { data: items } = await db.from("event_items").select("id, day, sort").order("day").order("sort");
  if (!items) redirect("/admin/events");
  const i = items.findIndex((e) => e.id === id);
  const j = i + dir;
  if (i >= 0 && j >= 0 && j < items.length && items[j].day === items[i].day) {
    // Renumber the day so equal sort values can't get stuck.
    const day = items.filter((e) => e.day === items[i].day);
    const a = day.findIndex((e) => e.id === id);
    [day[a], day[a + dir]] = [day[a + dir], day[a]];
    for (const [n, e] of day.entries()) await db.from("event_items").update({ sort: (n + 1) * 10 }).eq("id", e.id);
    refreshSite();
  }
  redirect(`/admin/events?ok=saved#e-${id}`);
}

export async function setEventVisible(form: FormData): Promise<void> {
  await requireAdmin();
  const id = str(form, "id");
  if (!UUID_RE.test(id)) redirect("/admin/events");
  await requireServiceDb().from("event_items").update({ visible: bool(form, "visible") }).eq("id", id);
  refreshSite();
  redirect(`/admin/events?ok=saved#e-${id}`);
}

/** Only events nobody has signed up for can be deleted; otherwise hide them. */
export async function deleteEvent(form: FormData): Promise<void> {
  await requireAdmin();
  const id = str(form, "id");
  if (!UUID_RE.test(id)) redirect("/admin/events");
  const db = requireServiceDb();
  const { count } = await db.from("registrations").select("id", { count: "exact", head: true }).eq("event_item_id", id);
  if (count) back(id, `error=${encodeURIComponent("People have signed up for this event, so it can’t be deleted. Hide it instead.")}`);
  const { error } = await db.from("event_items").delete().eq("id", id);
  if (error) back(id, `error=${encodeURIComponent(error.message)}`);
  refreshSite();
  redirect("/admin/events?ok=deleted");
}
