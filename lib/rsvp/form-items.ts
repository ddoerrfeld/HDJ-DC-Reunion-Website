import { SITE_TEXT_DEFAULTS, type SiteText } from "@/lib/content/site-text";
import type { EventItem } from "@/lib/data/events";
import { formatPrice } from "@/lib/data/events";
import type { Availability } from "@/lib/data/rsvp";
import { formatDayName, formatMonthDay, formatTimeRange } from "@/lib/format";
import type { FormItem } from "./form-model";

/** Server-side: shape event items for the RSVP form. TBD items stay choosable (organizer wants the count). */
export function toFormItems(items: EventItem[], availability: Record<string, Availability>, text?: Pick<SiteText, "rsvp.halftime_label" | "rsvp.halftime_hint">): FormItem[] {
  return items.map((item) => {
      const a = availability[item.slug];
      return {
        slug: item.slug,
        day: item.day,
        dayLabel: `${formatDayName(item.day)}, ${formatMonthDay(item.day)}`,
        title: item.title,
        timeLabel: formatTimeRange(item.startsAt, item.endsAt),
        locationName: item.locationName,
        choiceGroup: item.choiceGroup,
        requiresPayment: item.requiresPayment,
        priceLabel: item.requiresPayment
          ? item.priceCents === null
            ? "Paid · price coming soon"
            : `${formatPrice(item.priceCents)} per person`
          : null,
        allowsGuests: item.allowsGuests,
        halftimeEligible: item.halftimeEligible,
        halftimeLabel: text?.["rsvp.halftime_label"] ?? SITE_TEXT_DEFAULTS["rsvp.halftime_label"],
        halftimeHint: text?.["rsvp.halftime_hint"] ?? SITE_TEXT_DEFAULTS["rsvp.halftime_hint"],
        confirmed: item.confirmed,
        unconfirmedNote: item.unconfirmedNote,
        full: a?.capacity != null && a.taken >= a.capacity,
      };
  });
}
