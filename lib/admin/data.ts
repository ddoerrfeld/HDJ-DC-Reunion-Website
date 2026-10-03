import { formatDisplayName } from "@/lib/names";
import { photoUrl } from "@/lib/photos";
import type { Database } from "@/lib/supabase/database.types";
import { requireServiceDb } from "@/lib/supabase/admin";
import { thenPhotoUrl } from "@/lib/yearbook/portrait";

/**
 * Admin reads (SPEC §11). Service role, so every caller must have passed
 * requireAdmin() first — these functions are only imported by /admin pages,
 * admin actions and the CSV route, which all check.
 */

type Tables = Database["public"]["Tables"];
export type EventRow = Tables["event_items"]["Row"];
export type AttendeeRow = Tables["attendees"]["Row"];
export type RegistrationStatus = Database["public"]["Enums"]["registration_status"];
export type GradSchool = Database["public"]["Enums"]["grad_school"];

export const SCHOOL_LABEL: Record<GradSchool, string> = { crown: "Crown", jacobs: "Jacobs", other: "Other / both" };
const ACTIVE_STATUSES: RegistrationStatus[] = ["confirmed", "pending_payment", "pending_offline"];

/** PostgREST returns at most 1,000 rows per request; read everything in pages. */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < size) return out;
  }
}

export async function getAllEvents(): Promise<EventRow[]> {
  const { data, error } = await requireServiceDb().from("event_items").select("*").order("day").order("sort");
  if (error) throw new Error(error.message);
  return data;
}

export interface AdminGuest {
  firstName: string;
  lastName: string;
}

export interface AdminRegistration {
  id: string;
  eventId: string;
  status: RegistrationStatus;
  guestCount: number;
  halftimeWalk: boolean;
  paidAt: string | null;
  guests: AdminGuest[];
}

export interface AdminAttendee {
  id: string;
  firstName: string;
  hsLastName: string;
  currentLastName: string | null;
  nickname: string | null;
  displayName: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  school: GradSchool;
  showInDirectory: boolean;
  classmateStatus: Database["public"]["Enums"]["classmate_status"];
  photoPath: string | null;
  photoUrl: string | null;
  photoHidden: boolean;
  thenPhotoPath: string | null;
  thenPhotoUrl: string | null;
  yearbookPageId: string | null;
  createdAt: string;
  updatedAt: string;
  registrations: AdminRegistration[];
}

const ATTENDEE_SELECT =
  "id, first_name, hs_last_name, current_last_name, nickname, email, phone, city, state, grad_school, show_in_directory, classmate_status, photo_path, photo_hidden, then_photo_path, yearbook_page_id, created_at, updated_at, status";

type AttendeeSel = Pick<
  AttendeeRow,
  | "id" | "first_name" | "hs_last_name" | "current_last_name" | "nickname" | "email" | "phone" | "city" | "state" | "grad_school"
  | "show_in_directory" | "classmate_status" | "photo_path" | "photo_hidden" | "then_photo_path" | "yearbook_page_id"
  | "created_at" | "updated_at" | "status"
>;

function toAttendee(a: AttendeeSel, regs: AdminRegistration[]): AdminAttendee {
  return {
    id: a.id,
    firstName: a.first_name,
    hsLastName: a.hs_last_name,
    currentLastName: a.current_last_name,
    nickname: a.nickname,
    displayName: formatDisplayName({ firstName: a.first_name, hsLastName: a.hs_last_name, currentLastName: a.current_last_name, nickname: a.nickname }),
    email: a.email,
    phone: a.phone,
    city: a.city,
    state: a.state,
    school: a.grad_school,
    showInDirectory: a.show_in_directory,
    classmateStatus: a.classmate_status,
    photoPath: a.photo_path,
    photoUrl: photoUrl(a.photo_path, 512),
    photoHidden: a.photo_hidden,
    thenPhotoPath: a.then_photo_path,
    thenPhotoUrl: thenPhotoUrl(a.then_photo_path, 512),
    yearbookPageId: a.yearbook_page_id,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    registrations: regs,
  };
}

/** Every active RSVP with registrations and guest names. Small (one class), so one pass in memory. */
export async function getAllAttendees(): Promise<AdminAttendee[]> {
  const db = requireServiceDb();
  const [attendees, regs, guests] = await Promise.all([
    fetchAll<AttendeeSel>((from, to) => db.from("attendees").select(ATTENDEE_SELECT).eq("status", "active").order("hs_last_name").order("first_name").range(from, to)),
    fetchAll<Tables["registrations"]["Row"]>((from, to) => db.from("registrations").select("*").order("created_at").range(from, to)),
    fetchAll<Tables["guests"]["Row"]>((from, to) => db.from("guests").select("*").order("last_name").range(from, to)),
  ]);
  const guestsByReg = new Map<string, AdminGuest[]>();
  for (const g of guests) {
    const list = guestsByReg.get(g.registration_id) ?? [];
    list.push({ firstName: g.first_name, lastName: g.last_name });
    guestsByReg.set(g.registration_id, list);
  }
  const regsByAttendee = new Map<string, AdminRegistration[]>();
  for (const r of regs) {
    const list = regsByAttendee.get(r.attendee_id) ?? [];
    list.push({
      id: r.id,
      eventId: r.event_item_id,
      status: r.status,
      guestCount: r.guest_count,
      halftimeWalk: r.halftime_walk,
      paidAt: r.paid_at,
      guests: guestsByReg.get(r.id) ?? [],
    });
    regsByAttendee.set(r.attendee_id, list);
  }
  return attendees.map((a) => toAttendee(a, regsByAttendee.get(a.id) ?? []));
}

export async function getAttendee(id: string): Promise<AdminAttendee | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = requireServiceDb();
  const { data: a } = await db.from("attendees").select(ATTENDEE_SELECT).eq("id", id).maybeSingle();
  if (!a || a.status !== "active") return null;
  const { data: regs, error } = await db.from("registrations").select("*, guests(*)").eq("attendee_id", id).order("created_at");
  if (error) throw new Error(error.message);
  return toAttendee(
    a,
    regs.map((r) => ({
      id: r.id,
      eventId: r.event_item_id,
      status: r.status,
      guestCount: r.guest_count,
      halftimeWalk: r.halftime_walk,
      paidAt: r.paid_at,
      guests: r.guests.map((g) => ({ firstName: g.first_name, lastName: g.last_name })),
    })),
  );
}

export interface EventStats {
  event: EventRow;
  /** Classmates with a confirmed (or legacy pending) spot. */
  registrations: number;
  /** Classmates + guests. */
  headcount: number;
  waitlist: number;
  waitlistHeadcount: number;
  halftimeWalkers: number;
  paid: number;
  unpaid: number;
  /** Price × headcount for paid registrations. */
  collectedCents: number;
  expectedCents: number;
}

export interface Dashboard {
  attendees: number;
  bySchool: Record<GradSchool, number>;
  guests: number;
  pendingClassmates: AdminAttendee[];
  inDirectory: number;
  withPhoto: number;
  withThenPhoto: number;
  events: EventStats[];
}

export function eventStats(events: EventRow[], attendees: AdminAttendee[]): EventStats[] {
  return events.map((event) => {
    const s: EventStats = { event, registrations: 0, headcount: 0, waitlist: 0, waitlistHeadcount: 0, halftimeWalkers: 0, paid: 0, unpaid: 0, collectedCents: 0, expectedCents: 0 };
    const price = event.requires_payment ? (event.price_cents ?? 0) : 0;
    for (const a of attendees) {
      for (const r of a.registrations) {
        if (r.eventId !== event.id) continue;
        const people = 1 + r.guestCount;
        if (ACTIVE_STATUSES.includes(r.status)) {
          s.registrations += 1;
          s.headcount += people;
          if (r.halftimeWalk && event.halftime_eligible) s.halftimeWalkers += 1;
          if (event.requires_payment) {
            s.expectedCents += price * people;
            if (r.paidAt) {
              s.paid += 1;
              s.collectedCents += price * people;
            } else s.unpaid += 1;
          }
        } else if (r.status === "waitlist") {
          s.waitlist += 1;
          s.waitlistHeadcount += people;
        }
      }
    }
    return s;
  });
}

export async function getDashboard(): Promise<Dashboard> {
  const [events, attendees] = await Promise.all([getAllEvents(), getAllAttendees()]);
  const bySchool: Record<GradSchool, number> = { crown: 0, jacobs: 0, other: 0 };
  let guests = 0;
  for (const a of attendees) {
    bySchool[a.school] += 1;
    // A guest coming to several events is one person; count the largest party.
    guests += Math.max(0, ...a.registrations.filter((r) => ACTIVE_STATUSES.includes(r.status)).map((r) => r.guestCount));
  }
  return {
    attendees: attendees.length,
    bySchool,
    guests,
    pendingClassmates: attendees.filter((a) => a.classmateStatus === "pending"),
    inDirectory: attendees.filter((a) => a.showInDirectory && a.classmateStatus !== "pending").length,
    withPhoto: attendees.filter((a) => a.photoPath && !a.photoHidden).length,
    withThenPhoto: attendees.filter((a) => a.thenPhotoPath).length,
    events: eventStats(events, attendees),
  };
}

export function isActiveRegistration(status: RegistrationStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}

/** "Oct 1, 2026, 3:04 PM" in event time. */
export function formatStamp(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

// ------------------------------------------------------------------ settings --

export interface AdminSettings {
  rsvpDeadline: string | null;
  refundPolicyMd: string | null;
  refundCutoffDate: string | null;
  organizerContactEmail: string | null;
  faqMd: string | null;
  flags: { inMemoriam: boolean; faq: boolean; yearbookOcr: boolean };
  sectionGateEnabled: boolean;
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const { data, error } = await requireServiceDb().from("settings").select("key, value");
  if (error) throw new Error(error.message);
  const map = new Map(data.map((r) => [r.key, r.value as unknown]));
  const str = (k: string) => {
    const v = map.get(k);
    return typeof v === "string" && v.trim() ? v : null;
  };
  const flags = (map.get("feature_flags") ?? {}) as Record<string, unknown>;
  return {
    rsvpDeadline: str("rsvp_deadline"),
    refundPolicyMd: str("refund_policy_md"),
    refundCutoffDate: str("refund_cutoff_date"),
    organizerContactEmail: str("organizer_contact_email"),
    faqMd: str("faq_md"),
    flags: { inMemoriam: flags.in_memoriam === true, faq: flags.faq === true, yearbookOcr: flags.yearbook_ocr === true },
    sectionGateEnabled: map.get("section_gate_enabled") !== false,
  };
}

export async function getAdminEmails(): Promise<string[]> {
  const { data, error } = await requireServiceDb().from("admin_users").select("email").order("email");
  if (error) throw new Error(error.message);
  return data.map((r) => r.email);
}
