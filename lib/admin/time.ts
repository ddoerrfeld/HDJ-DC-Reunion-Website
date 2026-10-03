import { EVENT_TIME_ZONE } from "@/lib/data/events";

/**
 * Admin forms take wall-clock times in America/Chicago (what the organizer
 * sees on the invitation), whatever time zone their computer is in.
 */

const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: EVENT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function wall(date: Date): { day: string; time: string } {
  const p = Object.fromEntries(parts.formatToParts(date).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** ISO instant → "HH:mm" in Chicago ("" for null). */
export function chicagoTime(iso: string | null): string {
  return iso ? wall(new Date(iso)).time : "";
}

/** ISO instant → "YYYY-MM-DDTHH:mm" for <input type="datetime-local"> ("" for null). */
export function chicagoDateTime(iso: string | null): string {
  if (!iso) return "";
  const w = wall(new Date(iso));
  return `${w.day}T${w.time}`;
}

/** Chicago wall time ("YYYY-MM-DD" + "HH:mm") → ISO instant. Null when either part is missing or malformed. */
export function fromChicago(day: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const target = Date.UTC(y, m - 1, d, hh, mm);
  // Start from the wall time read as UTC and correct by Chicago's offset at that instant (twice covers DST edges).
  let guess = target;
  for (let i = 0; i < 2; i++) {
    const w = wall(new Date(guess));
    const [wy, wm, wd] = w.day.split("-").map(Number);
    const [wh, wmin] = w.time.split(":").map(Number);
    guess += target - Date.UTC(wy, wm - 1, wd, wh, wmin);
  }
  return new Date(guess).toISOString();
}
