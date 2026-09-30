import type { EventItem } from "@/lib/data/events";
import { SITE_URL } from "@/lib/site";

/**
 * Minimal RFC 5545 calendar writer. Times are emitted in UTC (the stored
 * instants), which every calendar app converts to the viewer's zone correctly.
 */

const CRLF = "\r\n";

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold lines at 75 octets (UTF-8 aware), continuation lines start with a space. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (size + bytes > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

function utcStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Strip the light Markdown admins may use, for plain-text calendar descriptions. */
function plain(md: string): string {
  return md.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`#>]/g, "").trim();
}

const EPOCH_2026 = Date.UTC(2026, 0, 1) / 1000;

function vevent(item: EventItem, now: Date): string[] | null {
  if (!item.startsAt) return null;
  const location = [item.locationName, item.address].filter(Boolean).join(", ");
  const notes = [
    plain(item.descriptionMd),
    item.confirmed ? "" : `${item.unconfirmedNote ?? "To be confirmed"}.`,
    item.endsAt ? "" : "End time not announced.",
    `Details: ${SITE_URL}/weekend#${item.slug}`,
  ].filter(Boolean);
  const updated = item.updatedAt ? new Date(item.updatedAt) : now;
  return [
    "BEGIN:VEVENT",
    `UID:${item.slug}@${new URL(SITE_URL).hostname}`,
    `DTSTAMP:${utcStamp(now.toISOString())}`,
    // Increases whenever the organizer edits the item, so re-imports update the entry.
    `SEQUENCE:${Math.max(0, Math.floor(updated.getTime() / 1000 - EPOCH_2026))}`,
    `DTSTART:${utcStamp(item.startsAt)}`,
    ...(item.endsAt ? [`DTEND:${utcStamp(item.endsAt)}`] : []),
    `SUMMARY:${escapeText(`${item.title} · Class of ’77 Reunion`)}`,
    ...(location ? [`LOCATION:${escapeText(location)}`] : []),
    `DESCRIPTION:${escapeText(notes.join("\n\n"))}`,
    `URL:${SITE_URL}/weekend#${item.slug}`,
    `STATUS:${item.confirmed ? "CONFIRMED" : "TENTATIVE"}`,
    "END:VEVENT",
  ];
}

export function buildCalendar(items: EventItem[], name = "Class of ’77 Reunion", now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Class of 77 Reunion//crownjacobs77.com//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    ...items.flatMap((item) => vevent(item, now) ?? []),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join(CRLF) + CRLF;
}

export function hasCalendarTime(item: EventItem): boolean {
  return item.startsAt !== null;
}
