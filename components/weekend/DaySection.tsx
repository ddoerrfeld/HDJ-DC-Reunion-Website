import { SeamRule } from "@/components/brand/Seam";
import { ComingSoonCard } from "@/components/ui/ComingSoonCard";
import { groupSlots, isPlaceholderItem, type EventDay, type EventItem } from "@/lib/data/events";
import { formatDayName, formatMonthDay, formatTimeRange } from "@/lib/format";
import { EventCard } from "./EventCard";

export function dayAnchor(day: string): string {
  return formatDayName(day).toLowerCase();
}

function ChoiceGroup({ items }: { items: EventItem[] }) {
  const time = formatTimeRange(items[0].startsAt, items[0].endsAt);
  const labelId = `${items[0].choiceGroup}-label`;
  return (
    <div role="group" aria-labelledby={labelId} className="rounded-card border-2 border-dashed border-line-strong/40 p-3 md:p-4">
      <p id={labelId} className="flex flex-wrap items-baseline gap-x-3 px-2 pb-3 pt-1">
        <span className="font-heading text-lead font-bold text-crown-blue-deep tabular-nums">{time ?? "Time coming soon"}</span>
        <span className="type-eyebrow text-muted">Choose one</span>
      </p>
      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        {items.map((item, index) => (
          <div key={item.slug} className="relative flex flex-col">
            {index > 0 ? (
              <span
                aria-hidden="true"
                className="type-eyebrow mx-auto -mt-1 mb-2 flex size-10 items-center justify-center rounded-pill bg-ink text-white md:absolute md:-left-7 md:top-1/2 md:z-10 md:m-0 md:-translate-y-1/2"
              >
                or
              </span>
            ) : null}
            <EventCard item={item} showTime={false} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DaySection({ day, items }: EventDay) {
  const anchor = dayAnchor(day);
  return (
    <section id={anchor} aria-labelledby={`${anchor}-title`} className="scroll-mt-24 py-12 md:py-16">
      <h2 id={`${anchor}-title`} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="type-display text-h2 text-ink md:text-h1">{formatDayName(day)}</span>
        <span className="font-heading text-h3 text-muted">{formatMonthDay(day)}, 2027</span>
      </h2>
      <SeamRule className="mt-3 w-full max-w-72" />
      <div className="mt-8 flex flex-col gap-6">
        {groupSlots(items).map((slot) => {
          const [first] = slot;
          if (slot.length > 1) return <ChoiceGroup key={first.slug} items={slot} />;
          if (isPlaceholderItem(first)) {
            return (
              <div key={first.slug} id={first.slug} className="scroll-mt-28">
                <ComingSoonCard title={first.title} eyebrow="Time & place coming soon">
                  {first.descriptionMd ? <p>{first.descriptionMd}</p> : null}
                </ComingSoonCard>
              </div>
            );
          }
          return <EventCard key={first.slug} item={first} />;
        })}
      </div>
    </section>
  );
}
