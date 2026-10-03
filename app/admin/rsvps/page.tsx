import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, Notice, SelectField, TableScroll, td, th } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { requireAdmin } from "@/lib/admin/auth";
import { formatStamp, getAllAttendees, getAllEvents, isActiveRegistration, SCHOOL_LABEL } from "@/lib/admin/data";
import { foldForSearch } from "@/lib/names";

export const metadata: Metadata = { title: "RSVPs" };

type Params = { q?: string; school?: string; event?: string; unpaid?: string; review?: string; ok?: string; error?: string };

export default async function AdminRsvps({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin();
  const p = await searchParams;
  const [attendees, events] = await Promise.all([getAllAttendees(), getAllEvents()]);
  const eventTitle = new Map(events.map((e) => [e.id, e.title]));
  const paidEvent = new Set(events.filter((e) => e.requires_payment).map((e) => e.id));
  const q = foldForSearch(p.q?.trim() ?? "");

  const rows = attendees.filter((a) => {
    if (p.school && a.school !== p.school) return false;
    if (p.review === "1" && a.classmateStatus !== "pending") return false;
    const regs = a.registrations.filter((r) => (p.event ? r.eventId === p.event : true));
    if (p.event && !regs.length) return false;
    if (p.unpaid === "1" && !regs.some((r) => paidEvent.has(r.eventId) && isActiveRegistration(r.status) && !r.paidAt)) return false;
    if (q) {
      const hay = foldForSearch([a.firstName, a.nickname, a.hsLastName, a.currentLastName, a.email, a.city, a.phone].filter(Boolean).join(" "));
      if (!q.split(/\s+/).every((word) => hay.includes(word))) return false;
    }
    return true;
  });
  const filtered = Boolean(q || p.school || p.event || p.unpaid || p.review);

  return (
    <div className="flex flex-col gap-8">
      <AdminHeader title="RSVPs">Search by any name, email, phone or city. Open a person to edit, mark paid, or resend their link.</AdminHeader>
      <Notice ok={p.ok} error={p.error} />
      <form method="get" className="grid items-end gap-4 md:grid-cols-[2fr_1fr_1.5fr_auto]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="q" className="text-body font-semibold text-ink">
            Search
          </label>
          <span className="relative">
            <Search size={22} strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input id="q" name="q" type="search" defaultValue={p.q} className="min-h-14 w-full rounded-card border-2 border-line-strong bg-paper-raised py-3 pr-4 pl-11 text-body text-ink" />
          </span>
        </div>
        <SelectField id="school" name="school" label="School" defaultValue={p.school ?? ""} options={[{ value: "", label: "All schools" }, ...Object.entries(SCHOOL_LABEL).map(([value, label]) => ({ value, label }))]} />
        <SelectField id="event" name="event" label="Event" defaultValue={p.event ?? ""} options={[{ value: "", label: "Any event" }, ...events.map((e) => ({ value: e.id, label: e.title }))]} />
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {p.unpaid ? <input type="hidden" name="unpaid" value="1" /> : null}
        {p.review ? <input type="hidden" name="review" value="1" /> : null}
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lead text-ink" aria-live="polite">
          {filtered ? `${rows.length} of ${attendees.length} RSVPs` : `${attendees.length} RSVPs`}
          {p.unpaid ? " · not paid yet" : ""}
          {p.review ? " · waiting for your check" : ""}
        </p>
        {filtered ? (
          <Link href="/admin/rsvps" className="inline-flex min-h-12 items-center font-semibold text-crown-blue-deep underline">
            Clear search
          </Link>
        ) : null}
      </div>
      <TableScroll label="RSVPs">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th scope="col" className={th}>Name</th>
              <th scope="col" className={th}>School</th>
              <th scope="col" className={th}>Events</th>
              <th scope="col" className={th}>Email</th>
              <th scope="col" className={th}>RSVP’d</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const going = a.registrations.filter((r) => r.status !== "cancelled");
              return (
                <tr key={a.id}>
                  <th scope="row" className={`${td} text-left`}>
                    <Link href={`/admin/rsvps/${a.id}`} className="font-semibold text-crown-blue-deep underline">
                      {a.displayName}
                    </Link>
                    <span className="mt-1 flex flex-wrap gap-2">
                      {a.classmateStatus === "pending" ? <Badge tone="paid">Needs your check</Badge> : null}
                      {a.showInDirectory ? null : <Badge tone="pending">Not listed</Badge>}
                    </span>
                  </th>
                  <td className={td}>{SCHOOL_LABEL[a.school]}</td>
                  <td className={td}>
                    <ul className="flex flex-col">
                      {going.map((r) => (
                        <li key={r.id} className="whitespace-nowrap">
                          {eventTitle.get(r.eventId)}
                          {r.guestCount ? ` +${r.guestCount}` : ""}
                          {r.status === "waitlist" ? " (waitlist)" : ""}
                          {paidEvent.has(r.eventId) && isActiveRegistration(r.status) ? (r.paidAt ? " · paid" : " · not paid") : ""}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className={`${td} break-all`}>{a.email}</td>
                  <td className={`${td} whitespace-nowrap`}>{formatStamp(a.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="p-6 text-body text-muted">No RSVPs match.</p> : null}
      </TableScroll>
    </div>
  );
}
