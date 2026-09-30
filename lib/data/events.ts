import { EVENT_ITEMS_SEED, type EventItem } from "@/lib/content/event-seed";

export type { EventItem };

export const EVENT_TIME_ZONE = "America/Chicago";
export const EVENT_START_DAY = "2027-10-08";

export interface EventDay {
  day: string;
  items: EventItem[];
}

/**
 * Single data-access seam for event items. Phase 1 reads the SPEC §6 seed;
 * Phase 2 swaps the body for a Supabase query without touching callers.
 */
export async function getEventItems(): Promise<EventItem[]> {
  return EVENT_ITEMS_SEED.filter((item) => item.visible).toSorted((a, b) => a.sort - b.sort);
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
