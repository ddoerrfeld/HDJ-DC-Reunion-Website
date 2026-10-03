import { Markdown } from "@/components/ui/Markdown";
import type { Metadata } from "next";
import Link from "next/link";
import { RsvpForm } from "@/components/rsvp/RsvpForm";
import { RsvpHeader } from "@/components/rsvp/RsvpHeader";
import { ComingSoonCard } from "@/components/ui/ComingSoonCard";
import { getEventItems } from "@/lib/data/events";
import { getAvailability, isPastDeadline } from "@/lib/data/rsvp";
import { getPublicSettings, getSiteText } from "@/lib/data/settings";
import { formatLongDate } from "@/lib/format";
import { toFormItems } from "@/lib/rsvp/form-items";
import { serviceDb } from "@/lib/supabase/admin";
import { yearbooksReady } from "@/lib/data/yearbooks";

export const metadata: Metadata = { title: "RSVP" };

export default async function RsvpPage() {
  const open = serviceDb() !== null;
  const [items, availability, settings, yearbooks] = await Promise.all([getEventItems(), getAvailability(), getPublicSettings(), yearbooksReady()]);
  const t = await getSiteText();
  const closed = isPastDeadline(settings.rsvpDeadline);

  return (
    <div className="container-page py-16 md:py-20">
      <div className="mx-auto max-w-3xl">
        <RsvpHeader title="RSVP">
          <Markdown>{t["rsvp.intro"]}</Markdown>
          {settings.rsvpDeadline && !closed ? (
            <p className="mt-2 text-body font-semibold">Please RSVP by {formatLongDate(settings.rsvpDeadline)}.</p>
          ) : null}
        </RsvpHeader>

        <div className="mt-10">
          {!open ? (
            <ComingSoonCard title="RSVPs open soon" headingLevel="h2" showEmailNote={false}>
              <p>The form will appear here shortly.</p>
            </ComingSoonCard>
          ) : closed ? (
            <ComingSoonCard title="RSVPs are closed" eyebrow="Thank you" headingLevel="h2" showEmailNote={false}>
              <Markdown>{t["rsvp.closed"]}</Markdown>
            </ComingSoonCard>
          ) : (
            <RsvpForm mode="create" items={toFormItems(items, availability, t)} yearbooksAvailable={yearbooks} />
          )}
        </div>

        <p className="mt-12 text-body text-ink">
          Already RSVP’d? <Link href="/rsvp/lost">Get your private link to make changes</Link>.
        </p>
      </div>
    </div>
  );
}
