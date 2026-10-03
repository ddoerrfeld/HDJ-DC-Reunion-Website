import { Download, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, Stat, TableScroll, td, textLink, th } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/Button";
import { requireAdmin } from "@/lib/admin/auth";
import { formatCents, getDashboard } from "@/lib/admin/data";
import { formatDayName } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  await requireAdmin();
  const d = await getDashboard();
  const paidEvents = d.events.filter((s) => s.event.requires_payment);
  const halftime = d.events.filter((s) => s.event.halftime_eligible);

  return (
    <div className="flex flex-col gap-10">
      <AdminHeader
        title="Dashboard"
        actions={
          <>
            <ButtonLink href="/admin/rsvps" variant="secondary" icon={<Users size={20} strokeWidth={1.75} aria-hidden="true" />}>
              All RSVPs
            </ButtonLink>
            <ButtonLink href="/admin/exports" variant="secondary" icon={<Download size={20} strokeWidth={1.75} aria-hidden="true" />}>
              Download lists
            </ButtonLink>
          </>
        }
      >
        Live numbers from the RSVPs. Headcounts include guests.
      </AdminHeader>

      {d.pendingClassmates.length ? (
        <section aria-labelledby="pending-h" className="flex flex-col gap-3 rounded-card border-2 border-seam-gold bg-jacobs-tint p-5">
          <h2 id="pending-h" className="text-h3 text-ink">
            {d.pendingClassmates.length === 1 ? "1 RSVP needs your check" : `${d.pendingClassmates.length} RSVPs need your check`}
          </h2>
          <p className="text-body text-ink">Their names weren’t found among the senior portraits. Confirm the ones you know.</p>
          <ul className="flex flex-col">
            {d.pendingClassmates.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/rsvps/${a.id}`} className={textLink}>
                  {a.displayName}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="totals-h" className="flex flex-col gap-4">
        <h2 id="totals-h" className="text-h3 text-ink">
          Classmates
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="RSVPs" value={d.attendees} sub={`plus ${d.guests} ${d.guests === 1 ? "guest" : "guests"}`} />
          <Stat label="Crown" value={d.bySchool.crown} />
          <Stat label="Jacobs" value={d.bySchool.jacobs} />
          <Stat label="Other / both" value={d.bySchool.other} />
        </dl>
        <p className="text-body text-muted">
          {d.inDirectory} listed on Who’s Coming · {d.withPhoto} with a photo · {d.withThenPhoto} with a ’77 portrait
        </p>
      </section>

      <section aria-labelledby="events-h" className="flex flex-col gap-4">
        <h2 id="events-h" className="text-h3 text-ink">
          By event
        </h2>
        <TableScroll label="Headcount by event">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th scope="col" className={th}>Event</th>
                <th scope="col" className={th}>Classmates</th>
                <th scope="col" className={th}>Headcount</th>
                <th scope="col" className={th}>Capacity</th>
                <th scope="col" className={th}>Waitlist</th>
              </tr>
            </thead>
            <tbody>
              {d.events.map((s) => (
                <tr key={s.event.id}>
                  <th scope="row" className={`${td} text-left font-semibold`}>
                    <Link href={`/admin/events/${s.event.id}`} className="text-crown-blue-deep underline">
                      {s.event.title}
                    </Link>
                    <span className="block text-small font-normal text-muted">
                      {formatDayName(s.event.day)}
                      {s.event.visible ? "" : " · hidden"}
                    </span>
                  </th>
                  <td className={td}>{s.registrations}</td>
                  <td className={`${td} font-semibold`}>{s.headcount}</td>
                  <td className={td}>{s.event.capacity ? `${s.headcount} of ${s.event.capacity}` : "No limit"}</td>
                  <td className={td}>{s.waitlist ? `${s.waitlist} (${s.waitlistHeadcount} people)` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </section>

      {halftime.length ? (
        <section aria-labelledby="halftime-h" className="flex flex-col gap-4">
          <h2 id="halftime-h" className="text-h3 text-ink">
            Halftime walkers
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {halftime.map((s) => (
              <Stat key={s.event.id} label={s.event.title} value={s.halftimeWalkers} sub={`of ${s.registrations} going`} />
            ))}
          </dl>
        </section>
      ) : null}

      <section aria-labelledby="pay-h" className="flex flex-col gap-4">
        <h2 id="pay-h" className="text-h3 text-ink">
          Payments
        </h2>
        {paidEvents.length ? (
          <TableScroll label="Payments by event">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={th}>Event</th>
                  <th scope="col" className={th}>Price</th>
                  <th scope="col" className={th}>Paid</th>
                  <th scope="col" className={th}>Not paid yet</th>
                  <th scope="col" className={th}>Collected</th>
                  <th scope="col" className={th}>Expected</th>
                </tr>
              </thead>
              <tbody>
                {paidEvents.map((s) => (
                  <tr key={s.event.id}>
                    <th scope="row" className={`${td} text-left font-semibold`}>{s.event.title}</th>
                    <td className={td}>{s.event.price_cents != null ? `${formatCents(s.event.price_cents)} per person` : "Price not set"}</td>
                    <td className={td}>{s.paid}</td>
                    <td className={td}>
                      {s.unpaid ? (
                        <Link href={`/admin/rsvps?event=${s.event.id}&unpaid=1`} className="font-semibold text-crown-blue-deep underline">
                          {s.unpaid}
                        </Link>
                      ) : (
                        0
                      )}
                    </td>
                    <td className={`${td} font-semibold`}>{formatCents(s.collectedCents)}</td>
                    <td className={td}>{formatCents(s.expectedCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        ) : (
          <p className="text-body text-muted">No event is set to “requires payment”. Turn it on for an event in Events.</p>
        )}
        <p className="text-small text-muted">There’s no online payment: mark each RSVP as paid when the money arrives (RSVPs → open a person).</p>
      </section>
    </div>
  );
}
