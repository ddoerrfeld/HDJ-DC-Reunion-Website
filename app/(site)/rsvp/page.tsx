import type { Metadata } from "next";
import Link from "next/link";
import { RsvpForm } from "@/components/rsvp/RsvpForm";
import { RsvpHeader } from "@/components/rsvp/RsvpHeader";
import { ComingSoonCard } from "@/components/ui/ComingSoonCard";
import { getEventItems } from "@/lib/data/events";
import { getAvailability, isPastDeadline } from "@/lib/data/rsvp";
import { getPublicSettings } from "@/lib/data/settings";
import { formatLongDate } from "@/lib/format";
import { toFormItems } from "@/lib/rsvp/form-items";
import { serviceDb } from "@/lib/supabase/admin";
import { turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = { title: "RSVP" };

export default async function RsvpPage() {
  const open = serviceDb() !== null;
  const [items, availability, settings] = await Promise.all([getEventItems(), getAvailability(), getPublicSettings()]);
  const closed = isPastDeadline(settings.rsvpDeadline);

  return (
    <div className="container-page py-16 md:py-20">
      <div className="mx-auto max-w-3xl">
        <RsvpHeader title="RSVP">
          <p>
            One short form: who you are, a photo if you like, and the events you’ll join. You’ll get a
            private link by email to change anything later — no account or password.
          </p>
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
              <p>
                The RSVP deadline has passed. If you already RSVP’d, you can still update your name and
                photo with your private link. Questions? Contact the organizers.
              </p>
            </ComingSoonCard>
          ) : (
            <RsvpForm mode="create" items={toFormItems(items, availability)} turnstileSiteKey={turnstileSiteKey()} />
          )}
        </div>

        <p className="mt-12 text-body text-ink">
          Already RSVP’d? <Link href="/rsvp/lost">Get your private link to make changes</Link>.
        </p>
      </div>
    </div>
  );
}
