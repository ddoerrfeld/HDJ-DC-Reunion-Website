import { EVENT_TIME_ZONE } from "@/lib/data/events";

const timeParts = new Intl.DateTimeFormat("en-US", {
  timeZone: EVENT_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function clock(iso: string): { time: string; period: string } {
  const parts = timeParts.formatToParts(new Date(iso));
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "";
  const period = (parts.find((p) => p.type === "dayPeriod")?.value ?? "").toUpperCase();
  return { time: `${hour}:${minute}`, period };
}

/** "3:30–4:30 PM", "11:00 AM–3:00 PM", "5:00 PM" — en dash, shared meridiem collapsed (SPEC §4.7). */
export function formatTimeRange(startsAt: string | null, endsAt: string | null): string | null {
  if (!startsAt) return null;
  const start = clock(startsAt);
  if (!endsAt) return `${start.time} ${start.period}`;
  const end = clock(endsAt);
  return start.period === end.period
    ? `${start.time}–${end.time} ${end.period}`
    : `${start.time} ${start.period}–${end.time} ${end.period}`;
}

/** Parse a YYYY-MM-DD calendar day without timezone drift. */
function dayToUtc(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDayName(day: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(dayToUtc(day));
}

export function formatMonthDay(day: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(
    dayToUtc(day),
  );
}

/** Whole calendar days from "today in Chicago" until the given day. */
export function daysUntil(day: string, now = new Date()): number {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return Math.round((dayToUtc(day).getTime() - dayToUtc(today).getTime()) / 86_400_000);
}
