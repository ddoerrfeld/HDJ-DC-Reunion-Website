import { Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { AdminHeader, CheckboxField, Notice, TextAreaField, textLink } from "@/components/admin/ui";
import { TextField } from "@/components/ui/Field";
import { requireAdmin } from "@/lib/admin/auth";
import { getAllEvents, type EventRow } from "@/lib/admin/data";
import { chicagoTime } from "@/lib/admin/time";
import { UUID_RE } from "@/lib/admin/util";
import { deleteEvent, saveEvent } from "../actions";

export const metadata: Metadata = { title: "Edit event" };

const BLANK: Omit<EventRow, "id" | "created_at" | "updated_at"> = {
  slug: "",
  day: "2027-10-09",
  starts_at: null,
  ends_at: null,
  title: "",
  description_md: "",
  location_name: null,
  address: null,
  address_confirmed: false,
  choice_group: null,
  requires_payment: false,
  price_cents: null,
  allows_guests: true,
  capacity: null,
  confirmed: false,
  unconfirmed_note: null,
  website_url: null,
  halftime_eligible: false,
  visible: true,
  sort: 0,
};

export default async function EditEvent({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { ok, error } = await searchParams;
  const events = await getAllEvents();
  const isNew = id === "new";
  if (!isNew && !UUID_RE.test(id)) notFound();
  const found = events.find((e) => e.id === id);
  if (!isNew && !found) notFound();
  const e = found ?? { ...BLANK, id: "" };
  const groups = [...new Set(events.map((x) => x.choice_group).filter(Boolean))] as string[];

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <Link href="/admin/events" className={textLink}>
        ← All events
      </Link>
      <AdminHeader title={isNew ? "Add an event" : e.title}>
        Times are Chicago time. Leave a field blank to show “Details coming soon” on the site.
        {!isNew && e.visible ? (
          <>
            {" "}
            <Link href={`/weekend#${e.slug}`} className="font-semibold text-crown-blue-deep underline">
              See it on the Weekend page
            </Link>
          </>
        ) : null}
      </AdminHeader>
      <Notice ok={ok} error={error} />
      <form action={saveEvent} className="flex flex-col gap-8">
        <input type="hidden" name="id" value={e.id} />
        <fieldset className="flex flex-col gap-5">
          <legend className="mb-2 text-h3 text-ink">What and when</legend>
          <TextField id="title" name="title" label="Title" defaultValue={e.title} required />
          <TextField id="slug" name="slug" label="Short name" hint="Used in links and lists. Lowercase letters, numbers and dashes." defaultValue={e.slug} required pattern="[a-z0-9-]+" />
          <TextField id="day" name="day" type="date" label="Day" defaultValue={e.day} required />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField id="start" name="start" type="time" label="Starts" optional defaultValue={chicagoTime(e.starts_at)} />
            <TextField id="end" name="end" type="time" label="Ends" optional defaultValue={chicagoTime(e.ends_at)} />
          </div>
          <TextAreaField id="description_md" name="description_md" label="Description" hint="Plain text. Blank lines start a new paragraph; **double asterisks** make bold." defaultValue={e.description_md} />
          <CheckboxField name="confirmed" label="Confirmed" hint="Untick to show a “to be confirmed” tag." defaultChecked={e.confirmed} />
          <TextField id="unconfirmed_note" name="unconfirmed_note" label="Wording while not confirmed" optional hint="Shown instead of “To be confirmed”, e.g. “Schedule to be confirmed by the schools”." defaultValue={e.unconfirmed_note ?? ""} />
        </fieldset>

        <fieldset className="flex flex-col gap-5">
          <legend className="mb-2 text-h3 text-ink">Where</legend>
          <TextField id="location_name" name="location_name" label="Place" optional defaultValue={e.location_name ?? ""} />
          <TextField id="address" name="address" label="Address" optional defaultValue={e.address ?? ""} />
          <CheckboxField name="address_confirmed" label="Address is confirmed" hint="Shows the map link." defaultChecked={e.address_confirmed} />
          <TextField id="website_url" name="website_url" type="url" label="Venue website" optional hint="Adds a “website” button for out-of-town guests." defaultValue={e.website_url ?? ""} />
        </fieldset>

        <fieldset className="flex flex-col gap-5">
          <legend className="mb-2 text-h3 text-ink">Sign-ups and price</legend>
          <CheckboxField name="requires_payment" label="Requires payment" hint="Shows the price, and adds it to the payment report." defaultChecked={e.requires_payment} />
          <TextField id="price" name="price" inputMode="decimal" label="Price per person ($)" optional defaultValue={e.price_cents != null ? (e.price_cents / 100).toFixed(e.price_cents % 100 ? 2 : 0) : ""} />
          <TextField id="capacity" name="capacity" inputMode="numeric" label="Capacity (people, including guests)" optional hint="Blank = no limit. When full, new sign-ups join a waitlist." defaultValue={e.capacity ?? ""} />
          <CheckboxField name="allows_guests" label="Guests may come" defaultChecked={e.allows_guests} />
          <CheckboxField name="halftime_eligible" label="Ask about walking at halftime" hint="For football games." defaultChecked={e.halftime_eligible} />
          <TextField
            id="choice_group"
            name="choice_group"
            label="Time-slot group"
            optional
            list="choice-groups"
            hint="Events with the same group happen at the same time; people can pick only one."
            defaultValue={e.choice_group ?? ""}
          />
          <datalist id="choice-groups">
            {groups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <CheckboxField name="visible" label="Show on the site" defaultChecked={e.visible} />
        </fieldset>
        <div>
          <SubmitButton>{isNew ? "Add event" : "Save changes"}</SubmitButton>
        </div>
      </form>

      {!isNew ? (
        <details className="rounded-card border-2 border-line p-4">
          <summary className="min-h-12 cursor-pointer content-center font-semibold text-ink">Delete this event…</summary>
          <form action={deleteEvent} className="mt-3 flex flex-col items-start gap-3">
            <input type="hidden" name="id" value={e.id} />
            <p className="text-body text-ink">Only possible if nobody has signed up. To take it off the site but keep the sign-ups, untick “Show on the site” instead.</p>
            <SubmitButton variant="secondary" pendingLabel="Deleting…" icon={<Trash2 size={20} strokeWidth={1.75} aria-hidden="true" />}>
              Delete event
            </SubmitButton>
          </form>
        </details>
      ) : null}
    </div>
  );
}
