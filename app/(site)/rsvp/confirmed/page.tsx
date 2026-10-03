import { getSiteText } from "@/lib/data/settings";
import { BedDouble, BookOpen, Hourglass, MailCheck, Pencil } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ClearDraft } from "@/components/rsvp/ClearDraft";
import { PaymentComingSoon } from "@/components/rsvp/PaymentComingSoon";
import { RsvpHeader } from "@/components/rsvp/RsvpHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { getEventItems } from "@/lib/data/events";
import { getRsvpByToken, summaryLines } from "@/lib/data/rsvp";
import { REVIEW_NOTE } from "@/lib/email/templates";
import { RSVP_COOKIE } from "@/lib/rsvp/token";

export const metadata: Metadata = { title: "RSVP confirmed", robots: { index: false, follow: false } };

const TONE = { Confirmed: "crown", Waitlist: "neutral" } as const;

export default async function ConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; email?: string }>;
}) {
  const token = (await cookies()).get(RSVP_COOKIE)?.value;
  const saved = await getRsvpByToken(token);
  if (!saved || !token) redirect("/rsvp");
  const { updated, email } = await searchParams;
  const [items, t] = await Promise.all([getEventItems(), getSiteText()]);
  const lines = summaryLines(saved.registrations, items);
  const paidTitles = items
    .filter((i) => i.requiresPayment && saved.registrations.some((r) => r.slug === i.slug && r.status !== "waitlist"))
    .map((i) => i.title);

  return (
    <div className="container-page py-16 md:py-20">
      <ClearDraft />
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <RsvpHeader eyebrow={updated ? "Changes saved" : "You’re on the list"} title={updated ? "RSVP updated" : t["rsvp.confirmed_title"]}>
          <p>
            {updated ? "Your changes are saved, " : "Thank you, "}
            {saved.person.firstName}.{" "}
            {email === "failed"
              ? "We couldn’t send your confirmation email just now — the organizers have been notified. Your RSVP is saved."
              : `We’ve emailed a confirmation and your private link to ${saved.person.email}.`}
          </p>
        </RsvpHeader>

        {saved.classmateStatus === "pending" ? (
          <section aria-labelledby="review-title" className="flex gap-4 rounded-card border-l-4 border-crown-blue-deep bg-crown-blue/10 p-6">
            <Hourglass size={28} strokeWidth={1.75} className="mt-1 shrink-0 text-crown-blue-deep" aria-hidden="true" />
            <div>
              <h2 id="review-title" className="text-lead font-bold text-ink">
                The organizer will confirm you shortly
              </h2>
              <p className="mt-1 text-body text-ink">{REVIEW_NOTE.replace(/^One more thing: w/, "W")}</p>
            </div>
          </section>
        ) : null}

        <section aria-labelledby="summary-title" className="card flex flex-col gap-6 p-6 md:p-8">
          <div className="flex items-center gap-5">
            <PhotoFrame school={saved.person.gradSchool} size={112}>
              {saved.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={saved.photoUrl} alt="" width={512} height={512} className="absolute inset-0 size-full object-cover" />
              ) : undefined}
            </PhotoFrame>
            {saved.yearbookPhoto?.url ? (
              <figure className="flex flex-col items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element -- rendered portrait in storage */}
                <img src={saved.yearbookPhoto.url} alt="Your 1977 senior portrait" width={90} height={112} className="h-28 w-[90px] rounded-sm object-cover ring-1 ring-line" />
                <figcaption className="text-small text-muted">1977</figcaption>
              </figure>
            ) : null}
            <h2 id="summary-title" className="text-h3 text-ink">
              Your weekend
            </h2>
          </div>
          <ul className="flex flex-col">
            {lines.map((line) => (
              <li key={line.title} className="flex flex-col gap-1 border-t border-line py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-heading text-lead font-bold text-ink">{line.title}</p>
                  <p className="text-small text-muted">
                    {line.when}
                    {line.guests > 0 ? ` · you + ${line.guests} guest${line.guests === 1 ? "" : "s"}` : ""}
                  </p>
                </div>
                <Badge tone={TONE[line.status]}>{line.status}</Badge>
              </li>
            ))}
          </ul>
          {lines.some((l) => l.status === "Waitlist") ? (
            <p className="text-body text-ink">We’ll email you if a waitlisted spot opens up.</p>
          ) : null}
        </section>

        <PaymentComingSoon titles={paidTitles} headingLevel="h2" />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="card flex flex-col gap-3 p-6">
            <Pencil size={28} strokeWidth={1.75} className="text-crown-blue-deep" aria-hidden="true" />
            <h2 className="text-lead font-bold text-ink">Need to change something?</h2>
            <p className="text-body text-ink">Use the private link in your email, or from this device:</p>
            <ButtonLink href={`/rsvp/edit/${token}`} variant="secondary">
              Edit your RSVP
            </ButtonLink>
          </div>
          {saved.classmateStatus !== "pending" ? (
            <div className="card flex flex-col gap-3 p-6">
              <BookOpen size={28} strokeWidth={1.75} className="text-crown-blue-deep" aria-hidden="true" />
              <h2 className="text-lead font-bold text-ink">The yearbooks are open to you</h2>
              <p className="text-body text-ink">Both 1977 yearbooks, page by page, with zoom for every name.</p>
              <ButtonLink href="/yearbooks" variant="secondary">
                Open the yearbooks
              </ButtonLink>
            </div>
          ) : null}
          <div className="card flex flex-col gap-3 p-6">
            <BedDouble size={28} strokeWidth={1.75} className="text-crown-blue-deep" aria-hidden="true" />
            <h2 className="text-lead font-bold text-ink">Need a room?</h2>
            <p className="text-body text-ink">Hotel details and any group rate are on the Stay page.</p>
            <ButtonLink href="/stay" variant="secondary">
              See the hotel block
            </ButtonLink>
          </div>
        </div>
        <p className="flex items-center gap-2 text-small text-muted">
          <MailCheck size={18} strokeWidth={1.75} aria-hidden="true" />
          Didn’t get the email? Check your spam folder, or ask for your link again from the RSVP page.
        </p>
      </div>
    </div>
  );
}
