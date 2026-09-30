"use client";

import { AlertCircle, Pencil } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { Badge, ToBeConfirmed } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChoiceCard, TextField } from "@/components/ui/Field";
import type { FormItem, FormState, SelectionState } from "@/lib/rsvp/form-model";
import { emptySelection } from "@/lib/rsvp/form-model";
import type { GradSchool } from "@/lib/rsvp/schema";
import { ThenPreview } from "./SeeMePicker";

type Errors = Record<string, string>;

function FieldsetError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="flex items-start gap-2 text-body font-semibold text-error">
      <AlertCircle size={22} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

/* ------------------------------------------------------------ About you -- */

export function AboutStep({
  person,
  errors,
  onChange,
}: {
  person: FormState["person"];
  errors: Errors;
  onChange: (patch: Partial<FormState["person"]>) => void;
}) {
  const text = (key: keyof FormState["person"]) => ({
    value: String(person[key] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange({ [key]: e.target.value }),
  });
  return (
    <div className="flex flex-col gap-7">
      <TextField id="firstName" label="First name" autoComplete="given-name" error={errors.firstName} {...text("firstName")} />
      <TextField
        id="hsLastName"
        label="Your last name in high school (maiden name, if it’s changed)"
        hint="Classmates will find you by this name."
        autoComplete="off"
        error={errors.hsLastName}
        {...text("hsLastName")}
      />
      <ChoiceCard
        type="checkbox"
        label="My last name has changed since high school"
        checked={person.nameChanged}
        onChange={(e) => onChange({ nameChanged: e.target.checked })}
      />
      {person.nameChanged ? (
        <TextField
          id="currentLastName"
          label="Current last name"
          autoComplete="family-name"
          error={errors.currentLastName}
          {...text("currentLastName")}
        />
      ) : null}
      <TextField
        id="nickname"
        label="Nickname or the name you went by"
        hint="For example, “Sue” or “Chip.” Classmates can search for it."
        optional
        autoComplete="nickname"
        error={errors.nickname}
        {...text("nickname")}
      />
      <TextField
        id="email"
        label="Email address"
        hint="For your confirmation and your private link to make changes. Never shown publicly."
        type="email"
        inputMode="email"
        autoComplete="email"
        spellCheck={false}
        error={errors.email}
        {...text("email")}
      />
      <TextField
        id="phone"
        label="Phone"
        hint="Only the organizers see this."
        optional
        type="tel"
        autoComplete="tel"
        error={errors.phone}
        {...text("phone")}
      />
      <div className="grid gap-7 sm:grid-cols-[2fr_1fr]">
        <TextField id="city" label="City" optional autoComplete="address-level2" error={errors.city} {...text("city")} />
        <TextField id="state" label="State" optional autoComplete="address-level1" error={errors.state} {...text("state")} />
      </div>
      <p className="-mt-4 text-small text-muted">City and state are only seen by the organizers.</p>

      <fieldset id="gradSchool" tabIndex={-1} aria-describedby={errors.gradSchool ? "gradSchool-error" : undefined} className="flex flex-col gap-3">
        <legend className="mb-2 text-body font-semibold text-ink">Graduated from</legend>
        <FieldsetError id="gradSchool-error" message={errors.gradSchool} />
        {(
          [
            ["jacobs", "Jacobs ’77"],
            ["crown", "Crown ’77"],
            ["other", "Attended with the class but graduated elsewhere / didn’t graduate"],
          ] as Array<[GradSchool, string]>
        ).map(([value, label]) => (
          <ChoiceCard
            key={value}
            type="radio"
            name="gradSchool"
            value={value}
            label={label}
            checked={person.gradSchool === value}
            onChange={() => onChange({ gradSchool: value })}
          />
        ))}
      </fieldset>
    </div>
  );
}

/* --------------------------------------------------------- Your weekend -- */

function ItemMeta({ item, isSelected }: { item: FormItem; isSelected: boolean }) {
  return (
    <>
      {item.priceLabel ? <Badge tone="paid">{item.priceLabel}</Badge> : null}
      {!item.confirmed ? <ToBeConfirmed note={item.unconfirmedNote} /> : null}
      {item.full && !isSelected ? <Badge tone="neutral">Full — you’ll join the waitlist</Badge> : null}
    </>
  );
}

function describe(item: FormItem): string {
  const parts = [item.timeLabel ?? "Time coming soon", item.locationName ?? "Place coming soon"];
  return parts.join(" · ");
}

export function WeekendStep({
  items,
  selections,
  errors,
  lockedPaid,
  onChange,
}: {
  items: FormItem[];
  selections: FormState["selections"];
  errors: Errors;
  lockedPaid: boolean;
  onChange: (next: FormState["selections"]) => void;
}) {
  const sel = (slug: string): SelectionState => selections[slug] ?? emptySelection();
  const set = (slug: string, patch: Partial<SelectionState>) =>
    onChange({ ...selections, [slug]: { ...sel(slug), ...patch } });

  const chooseInGroup = (group: string, slug: string | null) => {
    const next = { ...selections };
    for (const item of items.filter((i) => i.choiceGroup === group)) {
      next[item.slug] = { ...sel(item.slug), selected: item.slug === slug };
    }
    onChange(next);
  };

  const days = [...new Set(items.map((i) => i.day))];

  const halftime = (item: FormItem) =>
    item.halftimeEligible && sel(item.slug).selected ? (
      <div className="ml-4 border-l-4 border-seam-gold pl-4">
        <ChoiceCard
          type="checkbox"
          label="I plan to walk onto the field at halftime to be recognized."
          description="This helps the organizers plan with the school."
          checked={sel(item.slug).halftime}
          onChange={(e) => set(item.slug, { halftime: e.target.checked })}
        />
      </div>
    ) : null;

  return (
    <div id="weekend" tabIndex={-1} className="flex flex-col gap-10">
      <FieldsetError id="weekend-error" message={errors.weekend} />
      {lockedPaid ? (
        <p className="rounded-card bg-crown-tint p-4 text-body text-crown-blue-deep">
          The RSVP deadline has passed, so paid events can’t be changed here. Please contact the organizers.
        </p>
      ) : null}
      {days.map((day) => {
        const dayItems = items.filter((i) => i.day === day);
        const seen = new Set<string>();
        return (
          <section key={day} aria-labelledby={`rsvp-day-${day}`} className="flex flex-col gap-4">
            <h3 id={`rsvp-day-${day}`} className="type-display text-lead text-ink">
              {dayItems[0].dayLabel}
            </h3>
            {dayItems.map((item) => {
              if (item.choiceGroup) {
                if (seen.has(item.choiceGroup)) return null;
                seen.add(item.choiceGroup);
                const group = dayItems.filter((i) => i.choiceGroup === item.choiceGroup);
                const chosen = group.find((i) => sel(i.slug).selected)?.slug ?? null;
                const locked = lockedPaid && group.some((i) => i.requiresPayment);
                return (
                  <fieldset key={item.choiceGroup} className="flex flex-col gap-3">
                    <legend className="mb-2 text-body font-semibold text-ink">
                      {item.timeLabel ?? "Time coming soon"} — choose one
                    </legend>
                    {group.map((option) => (
                      <Fragment key={option.slug}>
                        <ChoiceCard
                          type="radio"
                          name={`group-${item.choiceGroup}`}
                          value={option.slug}
                          label={option.title}
                          description={option.locationName ?? "Place coming soon"}
                          meta={<ItemMeta item={option} isSelected={chosen === option.slug} />}
                          checked={chosen === option.slug}
                          disabled={locked}
                          onChange={() => chooseInGroup(item.choiceGroup!, option.slug)}
                        />
                        {halftime(option)}
                      </Fragment>
                    ))}
                    <ChoiceCard
                      type="radio"
                      name={`group-${item.choiceGroup}`}
                      value=""
                      label="Not attending"
                      checked={chosen === null}
                      disabled={locked}
                      onChange={() => chooseInGroup(item.choiceGroup!, null)}
                    />
                  </fieldset>
                );
              }
              return (
                <Fragment key={item.slug}>
                  <ChoiceCard
                    type="checkbox"
                    label={item.title}
                    description={describe(item)}
                    meta={<ItemMeta item={item} isSelected={sel(item.slug).selected} />}
                    checked={sel(item.slug).selected}
                    disabled={lockedPaid && item.requiresPayment}
                    onChange={(e) => set(item.slug, { selected: e.target.checked })}
                  />
                  {halftime(item)}
                </Fragment>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- Guests -- */

export function GuestsStep({
  items,
  selections,
  errors,
  lockedPaid,
  onChange,
}: {
  items: FormItem[];
  selections: FormState["selections"];
  errors: Errors;
  lockedPaid: boolean;
  onChange: (next: FormState["selections"]) => void;
}) {
  const eligible = items.filter((i) => i.allowsGuests && selections[i.slug]?.selected);
  const set = (slug: string, patch: Partial<SelectionState>) =>
    onChange({ ...selections, [slug]: { ...(selections[slug] ?? emptySelection()), ...patch } });

  return (
    <div className="flex flex-col gap-10">
      <p className="rounded-card bg-jacobs-tint p-4 text-body text-ink">
        Is your guest also a Class of ’77 classmate? Please have them RSVP on their own so they appear on
        Who’s Coming. If you’re married to a classmate, you each RSVP separately.
      </p>
      {eligible.length === 0 ? (
        <p className="text-body text-ink">None of the events you chose allow guests. You can go straight to the next step.</p>
      ) : null}
      {eligible.map((item) => {
        const s = selections[item.slug]!;
        const locked = lockedPaid && item.requiresPayment;
        return (
          <fieldset key={item.slug} className="flex flex-col gap-4">
            <legend className="mb-2 font-heading text-lead font-bold text-ink">
              How many guests will join you at {item.title}?
            </legend>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4].map((n) => (
                <label
                  key={n}
                  className="flex min-h-12 min-w-14 cursor-pointer items-center justify-center rounded-card border-2 border-line-strong bg-paper-raised px-4 text-lead font-semibold text-ink has-checked:border-crown-blue-deep has-checked:bg-crown-blue-deep has-checked:text-white has-disabled:cursor-not-allowed has-disabled:opacity-60 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-seam-gold"
                >
                  <input
                    type="radio"
                    name={`guests-${item.slug}`}
                    value={n}
                    checked={s.guests === n}
                    disabled={locked}
                    onChange={() => set(item.slug, { guests: n })}
                    className="absolute size-px opacity-0"
                  />
                  {n}
                  <span className="visually-hidden">{n === 1 ? " guest" : " guests"}</span>
                </label>
              ))}
            </div>
            {item.requiresPayment && s.guests > 0 ? (
              <div className="flex flex-col gap-5 rounded-card border border-line bg-paper-raised p-5">
                <p className="text-body text-ink">Guest names are used for name tags and check-in.</p>
                {Array.from({ length: s.guests }, (_, g) => {
                  const name = s.guestNames[g] ?? { first: "", last: "" };
                  const update = (patch: Partial<typeof name>) => {
                    const names = [...s.guestNames];
                    while (names.length <= g) names.push({ first: "", last: "" });
                    names[g] = { ...name, ...patch };
                    set(item.slug, { guestNames: names });
                  };
                  return (
                    <div key={g} className="grid gap-5 sm:grid-cols-2">
                      <TextField
                        id={`guest-${item.slug}-${g}-first`}
                        label={`Guest ${g + 1} first name`}
                        autoComplete="off"
                        value={name.first}
                        disabled={locked}
                        error={errors[`guest-${item.slug}-${g}-first`]}
                        onChange={(e) => update({ first: e.target.value })}
                      />
                      <TextField
                        id={`guest-${item.slug}-${g}-last`}
                        label={`Guest ${g + 1} last name`}
                        autoComplete="off"
                        value={name.last}
                        disabled={locked}
                        error={errors[`guest-${item.slug}-${g}-last`]}
                        onChange={(e) => update({ last: e.target.value })}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}
          </fieldset>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- Review -- */

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="card p-5 md:p-6" aria-label={title}>
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lead font-bold text-ink">{title}</h3>
        <Button variant="secondary" className="min-h-12 px-4 py-2" onClick={onEdit} icon={<Pencil size={18} strokeWidth={1.75} aria-hidden="true" />}>
          Edit<span className="visually-hidden"> {title.toLowerCase()}</span>
        </Button>
      </div>
      <div className="mt-3 text-body text-ink">{children}</div>
    </section>
  );
}

const SCHOOL_LABEL: Record<GradSchool, string> = {
  jacobs: "Jacobs ’77",
  crown: "Crown ’77",
  other: "Attended with the class",
};

export function displayName(person: FormState["person"]): string {
  const nick = person.nickname.trim() ? ` “${person.nickname.trim()}”` : "";
  const last = person.nameChanged && person.currentLastName.trim()
    ? `(${person.hsLastName.trim()}) ${person.currentLastName.trim()}`
    : person.hsLastName.trim();
  return `${person.firstName.trim()}${nick} ${last}`;
}

export function ReviewStep({
  state,
  items,
  onEdit,
  onShowInDirectory,
}: {
  state: FormState;
  items: FormItem[];
  onEdit: (step: number) => void;
  onShowInDirectory: (value: boolean) => void;
}) {
  const chosen = items.filter((i) => state.selections[i.slug]?.selected);
  const p = state.person;
  return (
    <div className="flex flex-col gap-5">
      <ReviewSection title="About you" onEdit={() => onEdit(0)}>
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
          <dt className="font-semibold">Name</dt>
          <dd>{displayName(p)}</dd>
          <dt className="font-semibold">Email</dt>
          <dd className="[overflow-wrap:anywhere]">{p.email}</dd>
          {p.phone ? (
            <>
              <dt className="font-semibold">Phone</dt>
              <dd>{p.phone}</dd>
            </>
          ) : null}
          {p.city || p.state ? (
            <>
              <dt className="font-semibold">From</dt>
              <dd>{[p.city, p.state].filter(Boolean).join(", ")}</dd>
            </>
          ) : null}
          <dt className="font-semibold">School</dt>
          <dd>{p.gradSchool ? SCHOOL_LABEL[p.gradSchool] : "—"}</dd>
        </dl>
      </ReviewSection>

      <ReviewSection title="Photos" onEdit={() => onEdit(1)}>
        {state.photo || state.yearbookPhoto ? (
          <div className="flex flex-wrap items-end gap-5">
            {state.photo ? (
              <figure className="flex flex-col gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={state.photo.url} alt="Your photo" width={96} height={96} className="size-24 rounded-sm object-cover ring-1 ring-line" />
                <figcaption className="text-small text-muted">Now</figcaption>
              </figure>
            ) : null}
            {state.yearbookPhoto ? (
              <figure className="flex flex-col gap-1">
                <ThenPreview value={state.yearbookPhoto} size={96} />
                <figcaption className="text-small text-muted">1977</figcaption>
              </figure>
            ) : null}
          </div>
        ) : (
          <p className="text-muted">No photo — that’s fine.</p>
        )}
      </ReviewSection>

      <ReviewSection title="Your weekend" onEdit={() => onEdit(2)}>
        <ul className="flex flex-col gap-3">
          {chosen.map((item) => {
            const s = state.selections[item.slug]!;
            return (
              <li key={item.slug}>
                <span className="font-semibold">{item.title}</span>
                <span className="block text-small text-muted">
                  {item.dayLabel} · {item.timeLabel ?? "time coming soon"}
                  {item.allowsGuests && s.guests > 0 ? ` · you + ${s.guests} guest${s.guests === 1 ? "" : "s"}` : ""}
                  {item.halftimeEligible && s.halftime ? " · walking at halftime" : ""}
                </span>
                {item.priceLabel || (item.full && !s.selected) ? (
                  <span className="mt-1 flex flex-wrap gap-2">
                    <ItemMeta item={item} isSelected={false} />
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="mt-3">
          <button type="button" className="min-h-12 font-semibold text-crown-blue-deep underline" onClick={() => onEdit(3)}>
            Change guests
          </button>
        </p>
      </ReviewSection>

      <ChoiceCard
        type="checkbox"
        label="Show me on the Who’s Coming page (name, photo, school, and activities only)."
        description="Your email, phone, and city are never shown."
        checked={state.showInDirectory}
        onChange={(e) => onShowInDirectory(e.target.checked)}
      />
    </div>
  );
}
