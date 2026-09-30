import { CalendarClock, ExternalLink, MapPin, Navigation, Phone } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { Markdown } from "@/components/ui/Markdown";
import type { Lodging } from "@/lib/data/lodging";
import { daysUntil, formatLongDate } from "@/lib/format";
import { directionsUrl, mapUrl } from "@/lib/maps";
import { CopyCode } from "./CopyCode";

/** Countdown chip for the group-rate cutoff, switching to "closed" after the date (SPEC §6.1). */
export function CutoffChip({ cutoffDate }: { cutoffDate: string }) {
  const days = daysUntil(cutoffDate);
  const date = formatLongDate(cutoffDate);
  if (days < 0) {
    return (
      <p className="inline-flex items-center gap-2 rounded-pill border-2 border-error px-4 py-1.5 font-semibold text-error">
        <CalendarClock size={20} strokeWidth={1.75} aria-hidden="true" />
        Block closed — call the hotel
      </p>
    );
  }
  const left = days === 0 ? "today is the last day" : `${days} ${days === 1 ? "day" : "days"} left`;
  return (
    <p className="inline-flex items-center gap-2 rounded-pill bg-crown-tint px-4 py-1.5 font-semibold text-crown-blue-deep">
      <CalendarClock size={20} strokeWidth={1.75} aria-hidden="true" />
      Rate held until {date} — {left}
    </p>
  );
}

const smallAction = buttonClasses("secondary", false, "min-h-12 px-4 py-2");

function Actions({ lodging }: { lodging: Lodging }) {
  return (
    <div className="flex flex-wrap gap-3">
      <a href={mapUrl(lodging.name, lodging.address)} target="_blank" rel="noopener noreferrer" className={smallAction}>
        <MapPin size={20} strokeWidth={1.75} aria-hidden="true" />
        Map<span className="visually-hidden">: {lodging.name} (opens Google Maps in a new tab)</span>
      </a>
      <a href={directionsUrl(lodging.name, lodging.address)} target="_blank" rel="noopener noreferrer" className={smallAction}>
        <Navigation size={20} strokeWidth={1.75} aria-hidden="true" />
        Directions<span className="visually-hidden"> to {lodging.name} (opens Google Maps in a new tab)</span>
      </a>
      {lodging.phone ? (
        <a href={`tel:${lodging.phone.replace(/[^\d+]/g, "")}`} className={smallAction}>
          <Phone size={20} strokeWidth={1.75} aria-hidden="true" />
          Call {lodging.phone}
        </a>
      ) : null}
    </div>
  );
}

function BookButton({ lodging }: { lodging: Lodging }) {
  if (!lodging.bookingUrl) return null;
  return (
    <a href={lodging.bookingUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary")}>
      Book your room
      <ExternalLink size={20} strokeWidth={1.75} aria-hidden="true" />
      <span className="visually-hidden"> at {lodging.name} (opens the hotel’s website in a new tab)</span>
    </a>
  );
}

function Photo({ lodging, className = "" }: { lodging: Lodging; className?: string }) {
  if (!lodging.photoUrl) return null;
  return (
    <div className={`relative overflow-hidden bg-paper-sunk ${className}`}>
      {/* Admin-uploaded photo of unknown size; the fixed aspect box prevents layout shift. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={lodging.photoUrl} alt={`${lodging.name}`} loading="lazy" className="absolute inset-0 size-full object-cover" />
    </div>
  );
}

/** Official room block: featured, full-width (SPEC §6.1). */
export function LodgingFeature({ lodging, headingLevel: Heading = "h2" }: { lodging: Lodging; headingLevel?: "h2" | "h3" }) {
  return (
    <article aria-labelledby={`lodging-${lodging.id}`} className="card overflow-hidden">
      <div className="split-surface h-2" aria-hidden="true" />
      <div className={`grid ${lodging.photoUrl ? "lg:grid-cols-[2fr_3fr]" : ""}`}>
        <Photo lodging={lodging} className="aspect-[16/10] lg:aspect-auto lg:min-h-full" />
        <div className="flex flex-col gap-6 p-6 md:p-10">
          <div className="flex flex-col gap-2">
            <p>
              <Badge tone="paid">Official reunion room block</Badge>
            </p>
            <Heading id={`lodging-${lodging.id}`} className="text-h2 text-ink">
              {lodging.name}
            </Heading>
            <p className="flex items-start gap-2 text-body text-muted">
              <MapPin size={22} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
              {lodging.address}
            </p>
          </div>

          {lodging.rateText || lodging.cutoffDate ? (
            <div className="flex flex-col items-start gap-3">
              {lodging.rateText ? <p className="font-heading text-h3 font-bold text-ink">{lodging.rateText}</p> : null}
              {lodging.cutoffDate ? <CutoffChip cutoffDate={lodging.cutoffDate} /> : null}
            </div>
          ) : null}

          {lodging.groupCode ? (
            <div className="flex flex-col gap-3 rounded-card border-2 border-dashed border-line-strong bg-paper p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="type-eyebrow text-muted">Group code</p>
                <p className="text-h3 font-bold tracking-wider text-ink [overflow-wrap:anywhere]">{lodging.groupCode}</p>
                <p className="text-small text-muted">Give this code when you book online or by phone.</p>
              </div>
              <CopyCode code={lodging.groupCode} />
            </div>
          ) : null}

          <div className="flex flex-col gap-4">
            <BookButton lodging={lodging} />
            <Actions lodging={lodging} />
          </div>

          {lodging.driveTimesMd ? (
            <div>
              <h3 className="text-lead font-bold text-ink">Drive times</h3>
              <Markdown className="mt-2 text-ink">{lodging.driveTimesMd}</Markdown>
            </div>
          ) : null}
          {lodging.notesMd ? (
            <div>
              <h3 className="text-lead font-bold text-ink">Good to know</h3>
              <Markdown className="mt-2 text-ink">{lodging.notesMd}</Markdown>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** Other nearby options: smaller cards. */
export function LodgingCard({ lodging }: { lodging: Lodging }) {
  return (
    <article aria-labelledby={`lodging-${lodging.id}`} className="card flex flex-col overflow-hidden">
      <Photo lodging={lodging} className="aspect-[16/9]" />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div>
          <h3 id={`lodging-${lodging.id}`} className="text-h3 text-ink">
            {lodging.name}
          </h3>
          <p className="mt-1 text-body text-muted">{lodging.address}</p>
        </div>
        {lodging.rateText ? <p className="font-semibold text-ink">{lodging.rateText}</p> : null}
        {lodging.cutoffDate ? <CutoffChip cutoffDate={lodging.cutoffDate} /> : null}
        {lodging.groupCode ? (
          <div className="flex flex-wrap items-center gap-3">
            <p>
              <span className="text-muted">Code: </span>
              <span className="font-bold tracking-wider text-ink">{lodging.groupCode}</span>
            </p>
            <CopyCode code={lodging.groupCode} />
          </div>
        ) : null}
        {lodging.driveTimesMd ? <Markdown className="text-small text-ink">{lodging.driveTimesMd}</Markdown> : null}
        {lodging.notesMd ? <Markdown className="text-small text-ink">{lodging.notesMd}</Markdown> : null}
        <div className="mt-auto flex flex-col gap-3 pt-2">
          {lodging.bookingUrl ? (
            <a href={lodging.bookingUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary")}>
              Hotel website
              <ExternalLink size={20} strokeWidth={1.75} aria-hidden="true" />
              <span className="visually-hidden"> for {lodging.name} (opens in a new tab)</span>
            </a>
          ) : null}
          <Actions lodging={lodging} />
        </div>
      </div>
    </article>
  );
}
