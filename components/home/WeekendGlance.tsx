import { ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";
import { Badge, ToBeConfirmed } from "@/components/ui/Badge";
import { ComingSoonCard } from "@/components/ui/ComingSoonCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatPrice, getEventDays, groupSlots, isPlaceholderItem, type EventItem } from "@/lib/data/events";
import { formatDayName, formatMonthDay, formatTimeRange } from "@/lib/format";

function Slot({ slot }: { slot: EventItem[] }) {
  const [first] = slot;
  const time = formatTimeRange(first.startsAt, first.endsAt);
  return (
    <li className="grid gap-1 border-t border-line py-4 first:border-t-0 first:pt-0">
      <p className="text-small font-semibold text-muted tabular-nums">{time}</p>
      {slot.map((item, index) => (
        <div key={item.slug}>
          {index > 0 ? (
            <p className="my-1 text-small font-semibold text-muted" aria-hidden="true">
              or
            </p>
          ) : null}
          <p className="font-heading text-lead font-bold leading-snug text-ink">
            {index > 0 ? <span className="visually-hidden">or </span> : null}
            {item.title}
          </p>
          {item.locationName ? (
            <p className="mt-0.5 flex items-start gap-1.5 text-small text-muted">
              <MapPin size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
              {item.locationName}
            </p>
          ) : null}
          {!item.confirmed || item.requiresPayment ? (
            <p className="mt-2 flex flex-wrap gap-2">
              {item.requiresPayment ? (
                <Badge tone="paid">
                  {item.priceCents === null ? "Paid · price coming soon" : `${formatPrice(item.priceCents)} per person`}
                </Badge>
              ) : null}
              {!item.confirmed ? <ToBeConfirmed note={item.unconfirmedNote} /> : null}
            </p>
          ) : null}
        </div>
      ))}
    </li>
  );
}

export async function WeekendGlance() {
  const days = await getEventDays();
  return (
    <section aria-labelledby="weekend-title" className="bg-paper-sunk/60 py-16 md:py-24">
      <div className="container-page">
        <SectionHeading eyebrow="The weekend at a glance" title="Three days, two schools, one class" id="weekend-title">
          <p>Every event is optional. Pick what suits you when you RSVP.</p>
        </SectionHeading>

        <ol className="mt-10 grid gap-6 lg:grid-cols-3">
          {days.map(({ day, items }) => {
            const scheduled = items.filter((item) => !isPlaceholderItem(item));
            const pending = items.filter(isPlaceholderItem);
            return (
              <li key={day} className="card flex flex-col p-6 md:p-8">
                <h3 className="flex items-baseline justify-between gap-3 border-b-2 border-ink pb-3">
                  <span className="type-display text-lead text-ink">{formatDayName(day)}</span>
                  <span className="font-heading text-body text-muted">{formatMonthDay(day)}</span>
                </h3>
                {scheduled.length > 0 ? (
                  <ul className="mt-5">
                    {groupSlots(scheduled).map((slot) => (
                      <Slot key={slot[0].slug} slot={slot} />
                    ))}
                  </ul>
                ) : null}
                {pending.map((item) => (
                  <ComingSoonCard
                    key={item.slug}
                    title={item.title}
                    eyebrow="Time & place coming soon"
                    compact
                    className="mt-5 shadow-none"
                  />
                ))}
              </li>
            );
          })}
        </ol>

        <p className="mt-10">
          <Link href="/weekend" className="inline-flex min-h-12 items-center gap-2 text-lead font-semibold">
            See the full weekend
            <ArrowRight size={22} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </p>
      </div>
    </section>
  );
}
