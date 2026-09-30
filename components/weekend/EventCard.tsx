import { CalendarPlus, Clock3, MapPin } from "lucide-react";
import { Badge, ToBeConfirmed } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { Markdown } from "@/components/ui/Markdown";
import { formatPrice, type EventItem } from "@/lib/data/events";
import { formatTimeRange } from "@/lib/format";
import { mapUrl } from "@/lib/maps";

export function PriceBadge({ item }: { item: EventItem }) {
  if (!item.requiresPayment) return null;
  return (
    <Badge tone="paid">
      {item.priceCents === null ? "Paid event · price coming soon" : `${formatPrice(item.priceCents)} per person`}
    </Badge>
  );
}

const actionClass = buttonClasses("secondary", false, "min-h-12 px-4 py-2 text-body");

export function EventActions({ item }: { item: EventItem }) {
  if (!item.startsAt && !item.address) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {item.startsAt ? (
        <a href={`/calendar/${item.slug}`} download className={actionClass}>
          <CalendarPlus size={20} strokeWidth={1.75} aria-hidden="true" />
          Add to calendar
          <span className="visually-hidden">: {item.title}</span>
        </a>
      ) : null}
      {item.address ? (
        <a href={mapUrl(item.locationName, item.address)} target="_blank" rel="noopener noreferrer" className={actionClass}>
          <MapPin size={20} strokeWidth={1.75} aria-hidden="true" />
          Map
          <span className="visually-hidden">: {item.locationName ?? item.address} (opens Google Maps in a new tab)</span>
        </a>
      ) : null}
    </div>
  );
}

interface EventCardProps {
  item: EventItem;
  /** Hidden inside a "choose one" group, whose header already states the shared time. */
  showTime?: boolean;
}

export function EventCard({ item, showTime = true }: EventCardProps) {
  const time = formatTimeRange(item.startsAt, item.endsAt);
  const hasBadges = item.requiresPayment || !item.confirmed;
  return (
    <article
      id={item.slug}
      aria-labelledby={`${item.slug}-title`}
      className={`card grid scroll-mt-28 gap-4 p-6 md:p-8 ${showTime ? "md:grid-cols-[11rem_1fr] md:gap-8" : ""}`}
    >
      {showTime ? (
        <p className="font-heading text-lead font-bold leading-snug text-crown-blue-deep tabular-nums">
          {time ?? (
            <span className="inline-flex items-center gap-2 text-body text-muted">
              <Clock3 size={20} strokeWidth={1.75} aria-hidden="true" />
              Time coming soon
            </span>
          )}
        </p>
      ) : null}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h3 id={`${item.slug}-title`} className="text-h3 text-ink">
            {item.title}
          </h3>
          {hasBadges ? (
            <p className="flex flex-wrap gap-2">
              <PriceBadge item={item} />
              {!item.confirmed ? <ToBeConfirmed note={item.unconfirmedNote} /> : null}
            </p>
          ) : null}
        </div>

        {item.locationName ? (
          <div className="flex items-start gap-2">
            <MapPin size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
            <p>
              <span className="font-semibold text-ink">{item.locationName}</span>
              {item.address ? <span className="block text-muted">{item.address}</span> : null}
            </p>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-muted">
            <MapPin size={22} strokeWidth={1.75} aria-hidden="true" />
            Location coming soon
          </p>
        )}

        <Markdown className="measure text-ink">{item.descriptionMd}</Markdown>
        <EventActions item={item} />
      </div>
    </article>
  );
}
