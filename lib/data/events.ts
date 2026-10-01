import { EVENT_ITEMS_SEED, type ChoiceGroup, type EventItem } from "@/lib/content/event-seed";
import type { Database } from "@/lib/supabase/database.types";
import { publicDb } from "@/lib/supabase/server";

export type { EventItem };

export const EVENT_TIME_ZONE = "America/Chicago";
export const EVENT_START_DAY = "2027-10-08";

export interface EventDay {
  day: string;
  items: EventItem[];
}

type EventRow = Database["public"]["Tables"]["event_items"]["Row"];

function fromRow(row: EventRow): EventItem {
  return {
    slug: row.slug,
    day: row.day,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    title: row.title,
    descriptionMd: row.description_md,
    locationName: row.location_name,
    address: row.address,
    addressConfirmed: row.address_confirmed,
    // Admin may introduce new groups; the union type documents the seeded ones.
    choiceGroup: row.choice_group as ChoiceGroup | null,
    requiresPayment: row.requires_payment,
    priceCents: row.price_cents,
    allowsGuests: row.allows_guests,
    capacity: row.capacity,
    confirmed: row.confirmed,
    unconfirmedNote: row.unconfirmed_note,
    websiteUrl: row.website_url,
    halftimeEligible: row.halftime_eligible,
    visible: row.visible,
    sort: row.sort,
    updatedAt: row.updated_at,
  };
}

/** Visible event items in display order — from Supabase, or the seed in unconfigured preview. */
export async function getEventItems(): Promise<EventItem[]> {
  const db = publicDb();
  if (!db) return EVENT_ITEMS_SEED.filter((item) => item.visible).toSorted((a, b) => a.sort - b.sort);

  const { data, error } = await db
    .from("event_items")
    .select("*")
    .eq("visible", true)
    .order("day")
    .order("sort");
  if (error) throw new Error(`Failed to load event items: ${error.message}`);
  return data.map(fromRow);
}

export async function getEventItem(slug: string): Promise<EventItem | null> {
  return (await getEventItems()).find((item) => item.slug === slug) ?? null;
}

export async function getEventDays(): Promise<EventDay[]> {
  const days = new Map<string, EventItem[]>();
  for (const item of await getEventItems()) {
    const list = days.get(item.day) ?? [];
    list.push(item);
    days.set(item.day, list);
  }
  return [...days.entries()].map(([day, items]) => ({ day, items }));
}

/** Items sharing a choice_group are alternatives in one time slot (SPEC §6). */
export function groupSlots(items: EventItem[]): EventItem[][] {
  const slots: EventItem[][] = [];
  const byGroup = new Map<string, EventItem[]>();
  for (const item of items) {
    if (!item.choiceGroup) {
      slots.push([item]);
      continue;
    }
    const existing = byGroup.get(item.choiceGroup);
    if (existing) existing.push(item);
    else {
      const slot = [item];
      byGroup.set(item.choiceGroup, slot);
      slots.push(slot);
    }
  }
  return slots;
}

/** Nothing is known yet about when or where: render the designed placeholder. */
export function isPlaceholderItem(item: EventItem): boolean {
  return !item.startsAt && !item.locationName;
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
