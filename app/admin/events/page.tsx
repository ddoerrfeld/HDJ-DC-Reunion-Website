import { ArrowDown, ArrowUp, Eye, EyeOff, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, Notice } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { requireAdmin } from "@/lib/admin/auth";
import { formatCents, getAllEvents } from "@/lib/admin/data";
import { formatDayName, formatMonthDay, formatTimeRange } from "@/lib/format";
import { moveEvent, setEventVisible } from "./actions";

export const metadata: Metadata = { title: "Events" };

const iconBtn =
  "inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-card border-2 border-line-strong bg-paper-raised px-3 font-semibold text-ink hover:border-ink disabled:opacity-40";

export default async function AdminEvents({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const { ok, error } = await searchParams;
  const events = await getAllEvents();
  const days = [...new Set(events.map((e) => e.day))];

  return (
    <div className="flex flex-col gap-8">
      <AdminHeader
        title="Events"
        actions={
          <ButtonLink href="/admin/events/new" icon={<Plus size={20} strokeWidth={1.75} aria-hidden="true" />}>
            Add an event
          </ButtonLink>
        }
      >
        Everything on the Weekend page and in the RSVP form. Changes show on the site within seconds.
      </AdminHeader>
      <Notice ok={ok} error={error} />
      {days.map((day) => {
        const list = events.filter((e) => e.day === day);
        return (
          <section key={day} aria-labelledby={`d-${day}`} className="flex flex-col gap-3">
            <h2 id={`d-${day}`} className="text-h3 text-ink">
              {formatDayName(day)}, {formatMonthDay(day)}
            </h2>
            <ul className="flex flex-col gap-3">
              {list.map((e, i) => (
                <li key={e.id} id={`e-${e.id}`} className={`card flex flex-wrap items-center justify-between gap-4 p-4 ${e.visible ? "" : "opacity-80"}`}>
                  <div className="flex min-w-0 flex-col gap-1">
                    <Link href={`/admin/events/${e.id}`} className="text-lead font-semibold text-crown-blue-deep underline">
                      {e.title}
                    </Link>
                    <span className="text-body text-muted">
                      {formatTimeRange(e.starts_at, e.ends_at) ?? "Time to be announced"}
                      {e.location_name ? ` · ${e.location_name}` : ""}
                    </span>
                    <span className="flex flex-wrap gap-2">
                      {e.requires_payment ? <Badge tone="paid">{e.price_cents != null ? formatCents(e.price_cents) : "Paid — price not set"}</Badge> : <Badge>Free</Badge>}
                      {e.visible ? null : <Badge tone="pending">Hidden</Badge>}
                      {e.confirmed ? null : <Badge tone="pending">Not confirmed</Badge>}
                      {e.capacity ? <Badge>Limit {e.capacity}</Badge> : null}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={moveEvent}>
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="dir" value="up" />
                      <button type="submit" className={iconBtn} disabled={i === 0} aria-label={`Move ${e.title} up`}>
                        <ArrowUp size={20} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </form>
                    <form action={moveEvent}>
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="dir" value="down" />
                      <button type="submit" className={iconBtn} disabled={i === list.length - 1} aria-label={`Move ${e.title} down`}>
                        <ArrowDown size={20} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </form>
                    <form action={setEventVisible}>
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="visible" value={e.visible ? "0" : "1"} />
                      <button type="submit" className={iconBtn}>
                        {e.visible ? <EyeOff size={20} strokeWidth={1.75} aria-hidden="true" /> : <Eye size={20} strokeWidth={1.75} aria-hidden="true" />}
                        {e.visible ? "Hide" : "Show"}
                        <span className="visually-hidden"> {e.title}</span>
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
