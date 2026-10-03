import { toCsv, type Cell } from "./csv";
import { formatStamp, getAllAttendees, getAllEvents, isActiveRegistration, SCHOOL_LABEL, type AdminAttendee, type EventRow } from "./data";

/** CSV downloads for the organizer (SPEC §11). Private fields included — admin only. */

export interface ExportFile {
  name: string;
  csv: string;
}

const byHsLast = (a: AdminAttendee, b: AdminAttendee) =>
  a.hsLastName.localeCompare(b.hsLastName, "en", { sensitivity: "base" }) || a.firstName.localeCompare(b.firstName, "en", { sensitivity: "base" });

const statusText = (s: string) => (s === "waitlist" ? "Waitlist" : s === "cancelled" ? "Cancelled" : "Going");

function attendeesCsv(people: AdminAttendee[], events: EventRow[]): string {
  const title = new Map(events.map((e) => [e.id, e.title]));
  return toCsv(
    ["High-school last name", "First name", "Nickname", "Last name now", "Name tag", "School", "Email", "Phone", "City", "State", "Events", "Listed on Who’s Coming", "Classmate check", "RSVP’d", "Last changed"],
    people.toSorted(byHsLast).map((a) => [
      a.hsLastName, a.firstName, a.nickname, a.currentLastName, a.displayName, SCHOOL_LABEL[a.school], a.email, a.phone, a.city, a.state,
      a.registrations
        .filter((r) => r.status !== "cancelled")
        .map((r) => `${title.get(r.eventId)}${r.guestCount ? ` +${r.guestCount}` : ""}${r.status === "waitlist" ? " (waitlist)" : ""}`)
        .join("; "),
      a.showInDirectory, a.classmateStatus === "pending" ? "Waiting" : a.classmateStatus === "matched" ? "Matched" : "Confirmed",
      formatStamp(a.createdAt), formatStamp(a.updatedAt),
    ]),
  );
}

/** One row per person (classmate, then each of their guests): check-in sheet and name tags. */
function rosterCsv(event: EventRow, people: AdminAttendee[]): string {
  const rows: Cell[][] = [];
  for (const a of people.toSorted(byHsLast)) {
    const r = a.registrations.find((x) => x.eventId === event.id && x.status !== "cancelled");
    if (!r) continue;
    const paid = event.requires_payment ? (r.paidAt ? "Paid" : "Not paid") : "";
    rows.push([a.hsLastName, a.firstName, a.displayName, "Classmate", "", SCHOOL_LABEL[a.school], statusText(r.status), r.guestCount, event.halftime_eligible ? r.halftimeWalk : "", paid, a.email, a.phone]);
    for (const g of r.guests) {
      rows.push([g.lastName, g.firstName, `${g.firstName} ${g.lastName}`, "Guest", a.displayName, "", statusText(r.status), "", "", paid, "", ""]);
    }
  }
  return toCsv(["Last name", "First name", "Name tag", "Type", "Guest of", "School", "Status", "Guests", "Halftime walk", "Payment", "Email", "Phone"], rows);
}

function paymentsCsv(events: EventRow[], people: AdminAttendee[]): string {
  const rows: Cell[][] = [];
  for (const e of events.filter((x) => x.requires_payment)) {
    for (const a of people.toSorted(byHsLast)) {
      const r = a.registrations.find((x) => x.eventId === e.id && isActiveRegistration(x.status));
      if (!r) continue;
      const due = e.price_cents != null ? ((e.price_cents * (1 + r.guestCount)) / 100).toFixed(2) : "";
      rows.push([e.title, a.displayName, a.email, a.phone, 1 + r.guestCount, due, Boolean(r.paidAt), r.paidAt ? formatStamp(r.paidAt) : ""]);
    }
  }
  return toCsv(["Event", "Classmate", "Email", "Phone", "People", "Amount due ($)", "Paid", "Marked paid"], rows);
}

function halftimeCsv(events: EventRow[], people: AdminAttendee[]): string {
  const rows: Cell[][] = [];
  for (const e of events.filter((x) => x.halftime_eligible)) {
    for (const a of people.toSorted(byHsLast)) {
      const r = a.registrations.find((x) => x.eventId === e.id && isActiveRegistration(x.status) && x.halftimeWalk);
      if (r) rows.push([e.title, a.hsLastName, a.firstName, a.displayName, SCHOOL_LABEL[a.school], a.email, a.phone]);
    }
  }
  return toCsv(["Game", "High-school last name", "First name", "Name to announce", "School", "Email", "Phone"], rows);
}

export async function buildExport(file: string): Promise<ExportFile | null> {
  const [events, people] = await Promise.all([getAllEvents(), getAllAttendees()]);
  const stamp = new Date().toISOString().slice(0, 10);
  if (file === "attendees") return { name: `class77-rsvps-${stamp}.csv`, csv: attendeesCsv(people, events) };
  if (file === "payments") return { name: `class77-payments-${stamp}.csv`, csv: paymentsCsv(events, people) };
  if (file === "halftime") return { name: `class77-halftime-${stamp}.csv`, csv: halftimeCsv(events, people) };
  if (file.startsWith("roster-")) {
    const event = events.find((e) => e.slug === file.slice("roster-".length));
    if (event) return { name: `class77-${event.slug}-roster-${stamp}.csv`, csv: rosterCsv(event, people) };
  }
  return null;
}
