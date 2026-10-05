import { CheckCircle2, Mail, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { AdminHeader, CheckboxField, Notice, SelectField, textLink } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { TextField } from "@/components/ui/Field";
import { requireAdmin } from "@/lib/admin/auth";
import { loadRoster, similarClassmates } from "@/lib/classmates/match";
import { formatCents, formatStamp, getAllEvents, getAttendee, isActiveRegistration, SCHOOL_LABEL } from "@/lib/admin/data";
import { approve, clearSeeMe, deleteAttendee, removeRegistration, resendLink, setHalftime, setPaid, setPhotoHidden, setRegistrationStatus, updatePerson } from "../actions";

export const metadata: Metadata = { title: "RSVP" };

const small =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-card border-2 border-ink bg-paper-raised px-4 font-semibold text-ink hover:bg-paper-sunk";

function Hidden({ attendee, registration }: { attendee: string; registration?: string }) {
  return (
    <>
      <input type="hidden" name="attendee" value={attendee} />
      {registration ? <input type="hidden" name="registration" value={registration} /> : null}
    </>
  );
}

const STATUS_TEXT = { matched: "Matched to the senior portraits", approved: "Confirmed by you", pending: "Waiting for your check" } as const;

export default async function AdminRsvp({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { ok, error } = await searchParams;
  const [a, events] = await Promise.all([getAttendee(id), getAllEvents()]);
  if (!a) notFound();
  const close = a.classmateStatus === "pending" ? similarClassmates({ firstName: a.firstName, hsLastName: a.hsLastName, currentLastName: a.currentLastName }, await loadRoster()) : [];
  const byId = new Map(events.map((e) => [e.id, e]));

  return (
    <div className="flex max-w-4xl flex-col gap-10">
      <Link href="/admin/rsvps" className={textLink}>
        ← All RSVPs
      </Link>
      <AdminHeader title={a.displayName}>
        {SCHOOL_LABEL[a.school]} · RSVP’d {formatStamp(a.createdAt)} · last changed {formatStamp(a.updatedAt)}
      </AdminHeader>
      <Notice ok={ok} error={error} />

      <section aria-labelledby="check-h" className="card flex flex-col gap-3 p-5">
        <h2 id="check-h" className="text-h3 text-ink">
          Classmate check
        </h2>
        <p className="flex items-center gap-2 text-body text-ink">
          {a.classmateStatus === "pending" ? null : <CheckCircle2 size={22} strokeWidth={1.75} className="text-crown-blue-deep" aria-hidden="true" />}
          {STATUS_TEXT[a.classmateStatus]}
        </p>
        {a.classmateStatus === "pending" ? (
          <form action={approve} className="flex flex-col items-start gap-2">
            <Hidden attendee={a.id} />
            <p className="text-body text-muted">Until you confirm them they aren’t listed on Who’s Coming and can’t open the yearbooks. Their RSVP is saved either way.</p>
            {close.length ? (
              <p className="text-body text-ink">
                Similar names on the classmate list — if one is a misspelling, correct it and they’ll be confirmed automatically:{" "}
                {close.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 ? ", " : ""}
                    <Link href={`/admin/classmates?q=${encodeURIComponent(c.last_name)}#c-${c.id}`} className="font-semibold text-crown-blue-deep underline">
                      {c.first_name} {c.last_name}
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}
            <SubmitButton pendingLabel="Confirming…">Yes, this is a classmate</SubmitButton>
          </form>
        ) : null}
      </section>

      <section aria-labelledby="events-h" className="flex flex-col gap-4">
        <h2 id="events-h" className="text-h3 text-ink">
          Events
        </h2>
        {a.registrations.length === 0 ? <p className="text-body text-muted">Not signed up for any event.</p> : null}
        <ul className="flex flex-col gap-4">
          {a.registrations.map((r) => {
            const e = byId.get(r.eventId);
            if (!e) return null;
            const active = isActiveRegistration(r.status);
            return (
              <li key={r.id} id={`r-${r.id}`} className="card flex flex-col gap-4 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="text-lead font-semibold text-ink">{e.title}</h3>
                  <span className="flex flex-wrap gap-2">
                    {r.status === "waitlist" ? <Badge tone="pending">Waitlist</Badge> : active ? <Badge tone="crown">Going</Badge> : <Badge tone="pending">Cancelled</Badge>}
                    {e.requires_payment && active ? r.paidAt ? <Badge tone="paid">Paid</Badge> : <Badge tone="pending">Not paid yet</Badge> : null}
                  </span>
                </div>
                <p className="text-body text-ink">
                  {r.guestCount === 0 ? "Just them" : `Them + ${r.guestCount} ${r.guestCount === 1 ? "guest" : "guests"}`}
                  {r.guests.length ? `: ${r.guests.map((g) => `${g.firstName} ${g.lastName}`).join(", ")}` : ""}
                  {e.requires_payment && e.price_cents != null ? ` · ${formatCents(e.price_cents * (1 + r.guestCount))} due` : ""}
                </p>
                {e.halftime_eligible ? <p className="text-body text-ink">Walking at halftime: {r.halftimeWalk ? "Yes" : "No"}</p> : null}
                {e.requires_payment && r.paidAt ? <p className="text-small text-muted">Marked paid {formatStamp(r.paidAt)}</p> : null}
                <div className="flex flex-wrap gap-3">
                  {e.requires_payment && active ? (
                    <form action={setPaid}>
                      <Hidden attendee={a.id} registration={r.id} />
                      <input type="hidden" name="paid" value={r.paidAt ? "0" : "1"} />
                      <button type="submit" className={small}>
                        {r.paidAt ? "Mark as not paid" : "Mark as paid"}
                      </button>
                    </form>
                  ) : null}
                  {r.status === "waitlist" || active ? (
                    <form action={setRegistrationStatus}>
                      <Hidden attendee={a.id} registration={r.id} />
                      <input type="hidden" name="status" value={r.status === "waitlist" ? "confirmed" : "waitlist"} />
                      <button type="submit" className={small}>
                        {r.status === "waitlist" ? "Give them a spot" : "Move to waitlist"}
                      </button>
                    </form>
                  ) : null}
                  {e.halftime_eligible ? (
                    <form action={setHalftime}>
                      <Hidden attendee={a.id} registration={r.id} />
                      <input type="hidden" name="halftime" value={r.halftimeWalk ? "0" : "1"} />
                      <button type="submit" className={small}>
                        {r.halftimeWalk ? "Change halftime walk to No" : "Change halftime walk to Yes"}
                      </button>
                    </form>
                  ) : null}
                  <details className="w-full">
                    <summary className="inline-flex min-h-12 cursor-pointer items-center font-semibold text-crown-blue-deep underline">Remove from this event…</summary>
                    <form action={removeRegistration} className="mt-2 flex flex-col items-start gap-2">
                      <Hidden attendee={a.id} registration={r.id} />
                      <p className="text-body text-ink">Takes {a.firstName}{r.guestCount ? " and their guests" : ""} off {e.title}. They can sign up again from their link.</p>
                      <button type="submit" className={small}>
                        Yes, remove from {e.title}
                      </button>
                    </form>
                  </details>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-small text-muted">To change guests or add events, send them their link — they make the change themselves.</p>
      </section>

      <section aria-labelledby="link-h" className="card flex flex-col items-start gap-3 p-5">
        <h2 id="link-h" className="text-h3 text-ink">
          Their private link
        </h2>
        <p className="text-body text-ink">Emails {a.email} a new link to view or change their RSVP. Any earlier link stops working.</p>
        <form action={resendLink}>
          <Hidden attendee={a.id} />
          <SubmitButton variant="secondary" pendingLabel="Sending…" icon={<Mail size={20} strokeWidth={1.75} aria-hidden="true" />}>
            Email them a new link
          </SubmitButton>
        </form>
      </section>

      <section aria-labelledby="photos-h" className="flex flex-col gap-4">
        <h2 id="photos-h" className="text-h3 text-ink">
          Photos
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="card flex flex-col gap-3 p-5">
            <h3 className="text-lead font-semibold text-ink">Today</h3>
            {a.photoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- storage image, pre-sized */}
                <img src={a.photoUrl} alt={`${a.displayName} today`} width={512} height={512} className={`aspect-square w-48 rounded-sm object-cover ${a.photoHidden ? "opacity-40" : ""}`} />
                <form action={setPhotoHidden}>
                  <Hidden attendee={a.id} />
                  <input type="hidden" name="hidden" value={a.photoHidden ? "0" : "1"} />
                  <button type="submit" className={small}>
                    {a.photoHidden ? "Show photo again" : "Hide photo"}
                  </button>
                </form>
                {a.photoHidden ? <p className="text-small text-muted">Hidden: the site shows the monogram instead.</p> : null}
              </>
            ) : (
              <p className="text-body text-muted">No photo.</p>
            )}
          </div>
          <div className="card flex flex-col gap-3 p-5">
            <h3 className="text-lead font-semibold text-ink">In ’77</h3>
            {a.thenPhotoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- storage image, pre-sized */}
                <img src={a.thenPhotoUrl} alt={`${a.displayName} in 1977`} width={512} height={640} className="aspect-[4/5] w-40 rounded-sm object-cover" />
                <form action={clearSeeMe}>
                  <Hidden attendee={a.id} />
                  <button type="submit" className={small}>
                    Clear ’77 portrait
                  </button>
                </form>
                <p className="text-small text-muted">Wrong person? Clear it — they can choose again from their link.</p>
              </>
            ) : (
              <p className="text-body text-muted">No ’77 portrait chosen.</p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="details-h" className="flex flex-col gap-4">
        <h2 id="details-h" className="text-h3 text-ink">
          Details
        </h2>
        <form action={updatePerson} className="flex flex-col gap-5">
          <Hidden attendee={a.id} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField id="first_name" name="first_name" label="First name" defaultValue={a.firstName} required />
            <TextField id="nickname" name="nickname" label="Nickname" optional defaultValue={a.nickname ?? ""} />
            <TextField id="hs_last_name" name="hs_last_name" label="Last name in high school" defaultValue={a.hsLastName} required />
            <TextField id="current_last_name" name="current_last_name" label="Last name now" optional defaultValue={a.currentLastName ?? ""} />
            <TextField id="email" name="email" type="email" label="Email" defaultValue={a.email} required />
            <TextField id="phone" name="phone" type="tel" label="Phone" optional defaultValue={a.phone ?? ""} />
            <TextField id="city" name="city" label="City" optional defaultValue={a.city ?? ""} />
            <TextField id="state" name="state" label="State" optional defaultValue={a.state ?? ""} />
          </div>
          <SelectField id="grad_school" name="grad_school" label="Graduated from" defaultValue={a.school} options={[{ value: "crown", label: "Irving Crown" }, { value: "jacobs", label: "Harry D. Jacobs" }, { value: "other", label: "Other / attended both" }]} />
          <CheckboxField name="show_in_directory" label="Listed on Who’s Coming" defaultChecked={a.showInDirectory} />
          <div>
            <SubmitButton>Save details</SubmitButton>
          </div>
        </form>
      </section>

      <details className="rounded-card border-2 border-line p-4">
        <summary className="min-h-12 cursor-pointer content-center font-semibold text-ink">Delete this RSVP…</summary>
        <form action={deleteAttendee} className="mt-3 flex flex-col items-start gap-4">
          <Hidden attendee={a.id} />
          <p className="text-body text-ink">Removes {a.firstName}’s RSVP, sign-ups and photos for good. This can’t be undone.</p>
          <TextField id="confirm" name="confirm" label="Type DELETE to confirm" autoComplete="off" required />
          <SubmitButton variant="secondary" pendingLabel="Deleting…" icon={<Trash2 size={20} strokeWidth={1.75} aria-hidden="true" />}>
            Delete RSVP
          </SubmitButton>
        </form>
      </details>
    </div>
  );
}
