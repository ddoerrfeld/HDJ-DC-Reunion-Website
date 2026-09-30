import type { EventItem } from "@/lib/data/events";
import type { EmailLine } from "@/lib/email/templates";
import { formatDayName, formatMonthDay, formatTimeRange, daysUntil } from "@/lib/format";
import { photoUrl } from "@/lib/photos";
import type { Person, Selection } from "@/lib/rsvp/schema";
import { hashEditToken, looksLikeToken } from "@/lib/rsvp/token";
import { serviceDb } from "@/lib/supabase/admin";
import { publicDb } from "@/lib/supabase/server";

export type RegistrationStatus = "confirmed" | "pending_payment" | "pending_offline" | "waitlist" | "cancelled";

export interface SavedRegistration extends Selection {
  status: RegistrationStatus;
}

export interface SavedRsvp {
  attendeeId: string;
  person: Person;
  photoPath: string | null;
  photoUrl: string | null;
  showInDirectory: boolean;
  registrations: SavedRegistration[];
}

/** Loads an RSVP by its private edit token (service role; never exposed to the browser directly). */
export async function getRsvpByToken(token: string | undefined | null): Promise<SavedRsvp | null> {
  if (!token || !looksLikeToken(token)) return null;
  const db = serviceDb();
  if (!db) return null;
  const { data, error } = await db
    .from("attendees")
    .select(
      "id, first_name, hs_last_name, current_last_name, nickname, email, phone, city, state, grad_school, photo_path, show_in_directory, registrations(status, guest_count, halftime_walk, event_items(slug), guests(first_name, last_name))",
    )
    .eq("edit_token_hash", hashEditToken(token))
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(`Failed to load RSVP: ${error.message}`);
  if (!data) return null;

  return {
    attendeeId: data.id,
    person: {
      firstName: data.first_name,
      hsLastName: data.hs_last_name,
      nameChanged: Boolean(data.current_last_name),
      currentLastName: data.current_last_name ?? "",
      nickname: data.nickname ?? "",
      email: data.email,
      phone: data.phone ?? "",
      city: data.city ?? "",
      state: data.state ?? "",
      gradSchool: data.grad_school,
    },
    photoPath: data.photo_path,
    photoUrl: photoUrl(data.photo_path),
    showInDirectory: data.show_in_directory,
    registrations: data.registrations
      .filter((r) => r.status !== "cancelled" && r.event_items)
      .map((r) => ({
        slug: r.event_items!.slug,
        guests: r.guest_count,
        halftime: r.halftime_walk,
        guestNames: r.guests.map((g) => ({ first: g.first_name, last: g.last_name })),
        status: r.status,
      })),
  };
}

export interface Availability {
  capacity: number | null;
  taken: number;
}

/** Head counts per item (numbers only) to show "Full — join the waitlist" (SPEC §7.4). */
export async function getAvailability(): Promise<Record<string, Availability>> {
  const db = publicDb();
  if (!db) return {};
  const { data, error } = await db.rpc("event_availability");
  if (error) throw new Error(`Failed to load availability: ${error.message}`);
  return Object.fromEntries(data.map((row) => [row.slug, { capacity: row.capacity, taken: row.taken }]));
}

/** RSVP deadline is inclusive, in Chicago time. */
export function isPastDeadline(deadline: string | null, now = new Date()): boolean {
  return deadline !== null && /^\d{4}-\d{2}-\d{2}$/.test(deadline) && daysUntil(deadline, now) < 0;
}

export function statusLabel(status: RegistrationStatus): EmailLine["status"] {
  return status === "waitlist" ? "Waitlist" : "Confirmed";
}

export function describeWhen(item: EventItem): string {
  const day = `${formatDayName(item.day)}, ${formatMonthDay(item.day)}`;
  const time = formatTimeRange(item.startsAt, item.endsAt);
  return time ? `${day} · ${time}` : `${day} · time to be announced`;
}

/** Summary lines for the confirmation page and email, in event order. */
export function summaryLines(registrations: SavedRegistration[], items: EventItem[]): EmailLine[] {
  return items
    .map((item) => ({ item, reg: registrations.find((r) => r.slug === item.slug) }))
    .filter((x): x is { item: EventItem; reg: SavedRegistration } => x.reg !== undefined)
    .map(({ item, reg }) => ({
      paid: item.requiresPayment,
      title: item.title,
      when: describeWhen(item),
      where: item.locationName,
      guests: reg.guests,
      status: statusLabel(reg.status),
    }));
}
