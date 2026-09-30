import { getEventItem, getEventItems, type EventItem } from "@/lib/data/events";
import { buildCalendar, hasCalendarTime } from "@/lib/ics";

/**
 * Add-to-calendar files (SPEC §5): /calendar/<item-slug> for one item,
 * /calendar/all for every item that has a time. Items without a time 404.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const items =
    slug === "all"
      ? (await getEventItems()).filter(hasCalendarTime)
      : [await getEventItem(slug)].filter((item): item is EventItem => item !== null && hasCalendarTime(item));

  if (items.length === 0) return new Response("No calendar entry for this item yet.", { status: 404 });

  const filename = slug === "all" ? "class-of-77-reunion-weekend.ics" : `class-of-77-${slug}.ics`;
  return new Response(buildCalendar(items), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
