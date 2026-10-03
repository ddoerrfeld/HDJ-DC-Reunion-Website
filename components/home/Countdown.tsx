import { Markdown } from "@/components/ui/Markdown";
import { getSiteText } from "@/lib/data/settings";
import { EVENT_START_DAY } from "@/lib/data/events";
import { daysUntil } from "@/lib/format";

/**
 * Days-only countdown, computed in Chicago time. Deliberately not a ticking
 * clock: seconds-level motion is distracting and noisy for screen readers.
 */
export async function Countdown() {
  const t = await getSiteText();
  const days = daysUntil(EVENT_START_DAY);

  let figure: string;
  let caption: string;
  if (days > 1) {
    figure = days.toLocaleString("en-US");
    caption = "days until we’re back together";
  } else if (days === 1) {
    figure = "1";
    caption = "day to go — see you tomorrow";
  } else if (days >= -2) {
    figure = "Now";
    caption = "The reunion weekend is here";
  } else {
    figure = "’77";
    caption = "Thank you for coming home";
  }

  return (
    <section aria-labelledby="countdown-title" className="container-page py-16 md:py-20">
      <div className="grid items-center gap-8 md:grid-cols-[auto_1fr] md:gap-14">
        <p className="flex flex-col items-center md:items-start">
          <span className="type-display text-display-xl leading-none text-crown-blue-deep tabular-nums">
            {figure}
          </span>
          <span className="mt-2 text-lead font-semibold text-ink">{caption}</span>
        </p>
        <div className="flex flex-col gap-3 text-center md:border-l-2 md:border-line md:pl-14 md:text-left">
          <h2 id="countdown-title" className="text-h3 text-ink">
            {t["general.dates_long"]}
          </h2>
          <Markdown className="measure text-body text-ink max-md:mx-auto">{t["home.countdown_text"]}</Markdown>
        </div>
      </div>
    </section>
  );
}
