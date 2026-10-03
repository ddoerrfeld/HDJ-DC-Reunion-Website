import { Download } from "lucide-react";
import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getAllEvents } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Exports" };

function DownloadLink({ href, title, children }: { href: string; title: string; children: string }) {
  return (
    <li className="card flex flex-col gap-2 p-5">
      <a href={href} download className="inline-flex min-h-12 items-center gap-2 text-lead font-semibold text-crown-blue-deep underline">
        <Download size={22} strokeWidth={1.75} aria-hidden="true" />
        {title}
      </a>
      <p className="text-body text-muted">{children}</p>
    </li>
  );
}

export default async function AdminExports() {
  await requireAdmin();
  const events = await getAllEvents();
  return (
    <div className="flex flex-col gap-8">
      <AdminHeader title="Exports">
        Spreadsheets (CSV) that open in Excel, Numbers or Google Sheets. They include private details — emails and phone numbers — so keep them
        to the organizing team.
      </AdminHeader>
      <ul className="grid gap-4 md:grid-cols-2">
        <DownloadLink href="/admin/exports/attendees.csv" title="Everyone who RSVP’d">
          One row per classmate with contact details and their events. Use it for any group email.
        </DownloadLink>
        <DownloadLink href="/admin/exports/payments.csv" title="Payment report">
          Every sign-up for a paid event: amount due, paid or not, and when it was marked paid.
        </DownloadLink>
        <DownloadLink href="/admin/exports/halftime.csv" title="Halftime walkers">
          Everyone walking at halftime, per game, sorted by high-school last name.
        </DownloadLink>
      </ul>
      <section aria-labelledby="rosters-h" className="flex flex-col gap-4">
        <h2 id="rosters-h" className="text-h3 text-ink">
          Check-in rosters and name tags
        </h2>
        <p className="text-body text-muted">One row per person, guests listed under the classmate who brought them, sorted by high-school last name.</p>
        <ul className="grid gap-4 md:grid-cols-2">
          {events.map((e) => (
            <DownloadLink key={e.id} href={`/admin/exports/roster-${e.slug}.csv`} title={`${e.title} roster`}>
              {e.visible ? "Check-in sheet with name-tag names." : "Hidden event — check-in sheet with name-tag names."}
            </DownloadLink>
          ))}
        </ul>
      </section>
    </div>
  );
}
