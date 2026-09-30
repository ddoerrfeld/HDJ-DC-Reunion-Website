import { BedDouble, CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import { SeamRule } from "@/components/brand/Seam";
import { buttonClasses, ButtonLink } from "@/components/ui/Button";
import { DaySection, dayAnchor } from "@/components/weekend/DaySection";
import { getEventDays, type EventItem } from "@/lib/data/events";
import { formatDayName, formatMonthDay } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = { title: "The Weekend" };

// Organizer edits in the database appear within a minute, no redeploy (SPEC §0.2).
export const revalidate = 60;

/** schema.org Event data for each scheduled item (SPEC §14). */
function structuredData(items: EventItem[]) {
  return items
    .filter((item) => item.startsAt)
    .map((item) => ({
      "@context": "https://schema.org",
      "@type": "Event",
      name: `${item.title} — Class of ’77 50-Year Reunion`,
      startDate: item.startsAt,
      ...(item.endsAt ? { endDate: item.endsAt } : {}),
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      url: `${SITE_URL}/weekend#${item.slug}`,
      ...(item.locationName
        ? { location: { "@type": "Place", name: item.locationName, ...(item.address ? { address: item.address } : {}) } }
        : {}),
      ...(item.descriptionMd ? { description: item.descriptionMd } : {}),
    }));
}

export default async function WeekendPage() {
  const days = await getEventDays();
  const items = days.flatMap((d) => d.items);

  return (
    <div className="container-page py-16 md:py-20">
      <header className="flex flex-col gap-3">
        <p className="type-eyebrow text-crown-blue-deep">October 8–10, 2027</p>
        <h1 className="type-display text-h1 text-ink md:text-display">The weekend</h1>
        <SeamRule className="w-full max-w-72" />
        <p className="measure text-lead text-ink">
          Every event is optional — come to one or all of them. Where two events share a time, you’ll
          pick one when you RSVP. All times are Central.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <nav aria-label="Days">
          <ul className="flex flex-wrap gap-2">
            {days.map(({ day }) => (
              <li key={day}>
                <a
                  href={`#${dayAnchor(day)}`}
                  className="flex min-h-12 items-center rounded-pill border-2 border-ink px-5 font-semibold text-ink no-underline hover:bg-paper-sunk"
                >
                  {formatDayName(day)}, {formatMonthDay(day).replace("October", "Oct.")}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <a href="/calendar/all" download className={buttonClasses("secondary")}>
          <CalendarPlus size={20} strokeWidth={1.75} aria-hidden="true" />
          Add the whole weekend to my calendar
        </a>
      </div>

      {days.map((day) => (
        <DaySection key={day.day} {...day} />
      ))}

      <aside aria-labelledby="weekend-stay-title" className="card mt-4 flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="flex items-start gap-4">
          <BedDouble size={32} strokeWidth={1.75} className="shrink-0 text-crown-blue-deep" aria-hidden="true" />
          <div>
            <h2 id="weekend-stay-title" className="text-h3 text-ink">
              Need a room?
            </h2>
            <p className="text-body text-ink">Hotel details and any group rate are on the Stay page.</p>
          </div>
        </div>
        <ButtonLink href="/stay" variant="secondary">
          See where to stay
        </ButtonLink>
      </aside>


      <script
        type="application/ld+json"
        // JSON.stringify output with "<" escaped cannot break out of the script element.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(items)).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}
