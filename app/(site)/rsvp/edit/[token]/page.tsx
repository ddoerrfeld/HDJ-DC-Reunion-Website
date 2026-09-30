import type { Metadata } from "next";
import Link from "next/link";
import { DeleteRsvp } from "@/components/rsvp/DeleteRsvp";
import { RsvpForm } from "@/components/rsvp/RsvpForm";
import { RsvpHeader } from "@/components/rsvp/RsvpHeader";
import { ComingSoonCard } from "@/components/ui/ComingSoonCard";
import { getEventItems } from "@/lib/data/events";
import { getAvailability, getRsvpByToken, isPastDeadline } from "@/lib/data/rsvp";
import { getPublicSettings } from "@/lib/data/settings";
import { toFormItems } from "@/lib/rsvp/form-items";
import type { FormState } from "@/lib/rsvp/form-model";
import { emptySelection } from "@/lib/rsvp/form-model";

export const metadata: Metadata = { title: "Change your RSVP", robots: { index: false, follow: false } };

// Private, per-person page: never cached.
export const dynamic = "force-dynamic";

export default async function EditRsvpPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const saved = await getRsvpByToken(token);

  if (!saved) {
    return (
      <div className="container-page py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <RsvpHeader title="Link not recognized" />
          <div className="mt-10">
            <ComingSoonCard title="This link isn’t valid anymore" eyebrow="Private RSVP link" headingLevel="h2" showEmailNote={false}>
              <p>
                Links are replaced whenever a new one is requested. <Link href="/rsvp/lost">Get a fresh link by email</Link>.
              </p>
            </ComingSoonCard>
          </div>
        </div>
      </div>
    );
  }

  const [items, availability, settings] = await Promise.all([getEventItems(), getAvailability(), getPublicSettings()]);
  const selections: FormState["selections"] = {};
  for (const reg of saved.registrations) {
    selections[reg.slug] = { ...emptySelection(), selected: true, guests: reg.guests, halftime: reg.halftime, guestNames: reg.guestNames };
  }
  const initial: FormState = {
    person: saved.person,
    photo: saved.photoPath && saved.photoUrl ? { path: saved.photoPath, url: saved.photoUrl } : null,
    selections,
    showInDirectory: saved.showInDirectory,
  };

  return (
    <div className="container-page py-16 md:py-20">
      <div className="mx-auto max-w-3xl">
        <RsvpHeader eyebrow="Your private RSVP link" title="Change your RSVP">
          <p>Hi {saved.person.firstName}. Update anything below, then save on the last step.</p>
        </RsvpHeader>
        {error === "delete" ? (
          <p role="alert" className="mt-6 font-semibold text-error">
            We couldn’t delete your RSVP just now. Please try again.
          </p>
        ) : null}
        <div className="mt-10">
          <RsvpForm
            mode="edit"
            token={token}
            items={toFormItems(items, availability)}
            initial={initial}
            turnstileSiteKey={null}
            lockedPaid={isPastDeadline(settings.rsvpDeadline)}
          />
        </div>
        <DeleteRsvp token={token} />
      </div>
    </div>
  );
}
