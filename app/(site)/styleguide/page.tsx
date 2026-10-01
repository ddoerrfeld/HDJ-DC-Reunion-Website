import { ArrowRight, CalendarPlus, Camera, Check, Copy, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Monogram77 } from "@/components/brand/Monogram77";
import { DuotoneBand } from "@/components/brand/DuotoneBand";
import { CrownVikingMark, JacobsMark1977 } from "@/components/brand/SchoolMarks";
import { SeamBand, SeamRule } from "@/components/brand/Seam";
import Image from "next/image";
import modernJacobs from "@/assets/brand/HDJ.jpg";
import { Badge, ToBeConfirmed } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ComingSoonCard } from "@/components/ui/ComingSoonCard";
import { ChoiceCard, SplitPill, TextField } from "@/components/ui/Field";
import { PhotoFrame, type School } from "@/components/ui/PhotoFrame";
import { CutoffChip } from "@/components/stay/LodgingCard";
import { EventCard } from "@/components/weekend/EventCard";
import { EVENT_ITEMS_SEED } from "@/lib/content/event-seed";
import { isPreview } from "@/lib/site";

export const metadata: Metadata = { title: "Style guide", robots: { index: false, follow: false } };

const SWATCHES = [
  { token: "--crown-blue", hex: "#1F4E9E", fg: "text-white", note: "Crown primary · white text 7.95:1" },
  { token: "--crown-blue-deep", hex: "#14336B", fg: "text-white", note: "Links on paper 10.87:1 · white 12.24:1" },
  { token: "--jacobs-brown", hex: "#4A2C12", fg: "text-white", note: "Jacobs primary · white 12.65:1" },
  { token: "--jacobs-gold", hex: "#F0B429", fg: "text-jacobs-brown", note: "Fills only · brown text 6.79:1 · never text on paper" },
  { token: "--jacobs-tan", hex: "#BB9054", fg: "text-ink", note: "1977 cover tan · accents only · 2.58:1 on paper" },
  { token: "--seam-gold", hex: "#E8A317", fg: "text-ink", note: "The seam & focus ring (with ink ring)" },
  { token: "--paper", hex: "#F7F1E3", fg: "text-ink", note: "Page background · ink 15.24:1" },
  { token: "--ink", hex: "#1E1B16", fg: "text-white", note: "Body text" },
  { token: "--muted", hex: "#5C554A", fg: "text-white", note: "Secondary text 6.53:1 on paper" },
  { token: "--error", hex: "#9E2A1E", fg: "text-white", note: "Errors 6.65:1 on paper" },
] as const;

const TYPE_SCALE = [
  { cls: "text-display-xl", label: "Display XL · 68.7 px" },
  { cls: "text-display", label: "Display · 54.9 px" },
  { cls: "text-h1", label: "H1 · 43.9 px" },
  { cls: "text-h2", label: "H2 · 35.2 px" },
  { cls: "text-h3", label: "H3 · 28.1 px" },
  { cls: "text-lead", label: "Lead · 22.5 px" },
  { cls: "text-body", label: "Body · 18 px" },
  { cls: "text-small", label: "Small · 16 px (floor)" },
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-line py-14 first:border-t-0">
      <h2 id={id} className="text-h2 text-ink">
        {title}
      </h2>
      <SeamRule className="mt-3 w-full max-w-60" />
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Spec({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-small text-muted">{children}</p>;
}

function AttendeeCardSample({ school, name }: { school: School; name: string }) {
  const border = {
    crown: "border-crown-blue",
    jacobs: "border-jacobs-gold",
    other: "border-transparent [background:linear-gradient(var(--paper-raised),var(--paper-raised))_padding-box,linear-gradient(var(--seam-gradient-angle),var(--crown-blue)_50%,var(--jacobs-gold)_50%)_border-box]",
  }[school];
  const badge = {
    crown: <Badge tone="crown">Crown ’77</Badge>,
    jacobs: <Badge tone="jacobs">Jacobs ’77</Badge>,
    other: <Badge tone="neutral">Class of ’77</Badge>,
  }[school];
  return (
    <div className={`flex flex-col items-center gap-3 rounded-card border-4 bg-paper-raised p-5 text-center shadow-[var(--shadow-card)] ${border}`}>
      <PhotoFrame school={school} size={128} />
      <p className="font-heading text-lead font-bold text-ink">{name}</p>
      {badge}
    </div>
  );
}

export default function StyleguidePage() {
  // SPEC §4.7: admin-only in production. Admin auth arrives in Phase 7; until then it is preview-only.
  if (!isPreview()) notFound();

  return (
    <div className="container-page py-16">
      <header className="flex flex-col gap-3">
        <p className="type-eyebrow text-crown-blue-deep">Design system · Phase 1</p>
        <h1 className="type-display text-h1 text-ink md:text-display">Style guide</h1>
        <p className="measure text-lead text-ink">
          Every screen draws only from what is on this page. One button per role, one card, one photo
          frame, one icon set.
        </p>
      </header>

      <Section id="sg-monogram" title="The “77” monogram">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="card flex flex-col items-center justify-center gap-4 p-8">
            <Monogram77 height={160} title="Class of ’77 monogram, light version" />
            <Spec>Light — on paper</Spec>
          </div>
          <div className="halftone flex flex-col items-center justify-center gap-4 rounded-card bg-crown-blue p-8">
            <Monogram77 variant="dark" height={160} title="Class of ’77 monogram, dark version on blue" />
            <p className="text-small text-white">Dark — on Crown blue</p>
          </div>
          <div className="halftone flex flex-col items-center justify-center gap-4 rounded-card bg-jacobs-brown p-8">
            <Monogram77 variant="dark" height={160} title="Class of ’77 monogram, dark version on brown" />
            <p className="text-small text-white">Dark — on Jacobs brown</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-end gap-8">
          {[24, 40, 64, 96].map((h) => (
            <div key={h} className="flex flex-col items-center gap-2">
              <Monogram77 height={h} />
              <span className="text-small text-muted">{h} px</span>
            </div>
          ))}
        </div>
        <Spec>
          Crown 7 (blue, Viking-horn flourish) · gold seam · Jacobs 7 (brown, feathered wing). Both stems
          at 62°, the site-wide seam angle. Original artwork.
        </Spec>
      </Section>

      <Section id="sg-color" title="Color">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SWATCHES.map((s) => (
            <li key={s.token} className="card overflow-hidden">
              <div className={`flex h-24 items-end p-4 font-semibold ${s.fg}`} style={{ background: `var(${s.token})` }}>
                {s.hex}
              </div>
              <div className="p-4">
                <p className="text-small font-semibold text-ink">{s.token}</p>
                <p className="text-small text-muted">{s.note}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="sg-type" title="Typography">
        <div className="grid gap-8 lg:grid-cols-3">
          <div>
            <p className="type-display text-h2 text-ink">Graduate</p>
            <Spec>Display — “77”, school names, short labels. Uppercase, +2 % tracking. Never body text.</Spec>
          </div>
          <div>
            <p className="font-heading text-h2 font-bold text-ink">Bitter 700</p>
            <Spec>Headings H1–H4, card names, the hero headline.</Spec>
          </div>
          <div>
            <p className="font-sans text-h2 text-ink">Source Sans 3</p>
            <Spec>Body copy, forms, buttons. 18 px base, 1.6 line height, ~68 characters per line.</Spec>
          </div>
        </div>
        <ul className="mt-10 flex flex-col gap-4">
          {TYPE_SCALE.map((t) => (
            <li key={t.cls} className="flex flex-col gap-1 border-b border-line pb-4 md:flex-row md:items-baseline md:gap-6">
              <span className="w-56 shrink-0 text-small text-muted">{t.label}</span>
              <span className={`${t.cls} font-heading font-bold text-ink`}>Fifty years later</span>
            </li>
          ))}
        </ul>
        <Spec>Modular scale, ratio 1.25. No other sizes are used. Small text is floored at 16 px.</Spec>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="card p-6">
            <p className="type-eyebrow text-crown-blue-deep">Eyebrow label</p>
            <h3 className="mt-1 text-h3 text-ink">Heading three for cards</h3>
            <p className="mt-2 text-body text-ink">
              Body copy sits in Source Sans 3 at 18 px. Links look like{" "}
              <a href="#sg-type">this underlined Crown-blue link</a>. Ranges use en dashes (3:30–4:30 PM)
              and the class year is always ’77.
            </p>
            <p className="mt-2 text-small text-muted">Secondary text in muted ink.</p>
          </div>
        </div>
      </Section>

      <Section id="sg-buttons" title="Buttons">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary">RSVP</Button>
          <Button variant="secondary">See the weekend</Button>
          <Button variant="primary" icon={<ArrowRight size={20} strokeWidth={1.75} aria-hidden="true" />}>
            Submit RSVP
          </Button>
          <Button variant="secondary" icon={<CalendarPlus size={20} strokeWidth={1.75} aria-hidden="true" />}>
            Add to calendar
          </Button>
          <Button variant="primary" disabled className="disabled:cursor-not-allowed disabled:opacity-60">
            Unavailable
          </Button>
        </div>
        <div className="halftone mt-6 flex flex-wrap items-center gap-4 rounded-card bg-crown-blue p-6">
          <Button variant="primary">RSVP</Button>
          <Button variant="inverse">See the weekend</Button>
        </div>
        <div className="halftone mt-4 flex flex-wrap items-center gap-4 rounded-card bg-jacobs-brown p-6">
          <Button variant="primary">RSVP</Button>
          <Button variant="inverse">Visit the yearbooks</Button>
        </div>
        <Spec>
          Primary: gold with brown text — the main action. Secondary: outlined ink. Inverse: outlined
          white on blue, brown or ink. All ≥ 56 px tall. Focus: 3 px gold ring over a 2 px ink ring.
        </Spec>
      </Section>

      <Section id="sg-forms" title="Form fields">
        <div className="grid max-w-3xl gap-8">
          <TextField id="sg-first" label="First name" autoComplete="off" />
          <TextField
            id="sg-hs-last"
            label="Your last name in high school"
            hint="Maiden name, if it’s changed. Classmates will find you by this name."
            autoComplete="off"
          />
          <TextField
            id="sg-email"
            label="Email address"
            type="email"
            error="Please enter your email address."
            autoComplete="off"
          />
          <TextField id="sg-nick" label="Nickname or the name you went by" optional autoComplete="off" />

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-body font-semibold text-ink">Graduated from</legend>
            <ChoiceCard type="radio" name="sg-school" value="jacobs" label="Jacobs ’77" defaultChecked />
            <ChoiceCard type="radio" name="sg-school" value="crown" label="Crown ’77" />
            <ChoiceCard
              type="radio"
              name="sg-school"
              value="other"
              label="Attended with the class but graduated elsewhere / didn’t graduate"
            />
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-body font-semibold text-ink">Saturday evening</legend>
            <ChoiceCard
              type="checkbox"
              name="sg-dinner"
              label="Reunion Dinner"
              description="6:30–10:30 PM · Sample card for layout review"
              meta={
                <>
                  <Badge tone="paid">Paid · price coming soon</Badge>
                  <ToBeConfirmed />
                </>
              }
              defaultChecked
            />
            <ChoiceCard
              type="checkbox"
              name="sg-halftime"
              label="I plan to walk onto the field at halftime to be recognized."
            />
          </fieldset>

          <SplitPill
            name="sg-filter"
            legend="Show classmates from"
            defaultValue="all"
            options={[
              { value: "all", label: "All" },
              { value: "crown", label: "Crown" },
              { value: "jacobs", label: "Jacobs" },
              { value: "other", label: "Other" },
            ]}
          />
        </div>
        <Spec>
          Labels are always visible. Help text and errors are tied to the field. Radio and checkbox cards
          are real inputs with custom indicators. The split pill divides options with 62° seams.
        </Spec>
      </Section>

      <Section id="sg-cards" title="Cards & placeholders">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6 md:p-8">
            <p className="type-eyebrow text-crown-blue-deep">Standard card</p>
            <h3 className="mt-1 text-h3 text-ink">Hotel or event card</h3>
            <p className="mt-2 flex items-start gap-2 text-body text-ink">
              <MapPin size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
              Location line with a map link
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="crown">Crown ’77</Badge>
              <Badge tone="jacobs">Jacobs ’77</Badge>
              <Badge tone="paid">Paid</Badge>
              <ToBeConfirmed />
              <Badge tone="neutral">Waitlist</Badge>
            </div>
          </div>
          <ComingSoonCard title="Farewell Breakfast/Brunch" eyebrow="Location coming soon" />
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-3" aria-hidden="true">
          <div className="card flex flex-col items-center gap-3 p-5">
            <div className="skeleton size-32" />
            <div className="skeleton h-6 w-40" />
            <div className="skeleton h-5 w-24" />
          </div>
        </div>
        <Spec>Skeleton loader shaped like an attendee card (above). Placeholders use the seam band and never look broken.</Spec>
      </Section>

      <Section id="sg-events" title="Event cards & hotel chips">
        <div className="flex flex-col gap-6">
          {EVENT_ITEMS_SEED.filter((item) => ["fri-pregame", "sat-dinner"].includes(item.slug)).map((item) => (
            <EventCard key={item.slug} item={item} />
          ))}
          <div className="flex flex-wrap gap-4">
            <CutoffChip cutoffDate="2027-09-08" />
            <CutoffChip cutoffDate="2020-01-01" />
          </div>
        </div>
        <Spec>
          One event card for every item on /weekend: time column, title, price and confirmation tags,
          place, description, then Add to calendar and Map. Hotel cutoff chip before and after the date.
        </Spec>
      </Section>

      <Section id="sg-photos" title="Photo frames & attendee cards">
        <div className="grid gap-6 sm:grid-cols-3">
          <AttendeeCardSample school="crown" name="Crown graduate" />
          <AttendeeCardSample school="jacobs" name="Jacobs graduate" />
          <AttendeeCardSample school="other" name="Attended with the class" />
        </div>
        <Spec>
          Card border: blue for Crown grads, gold for Jacobs grads, split for everyone else. With no photo,
          the frame shows the monogram in the school color.
        </Spec>
      </Section>

      <Section id="sg-seam" title="Seam treatments">
        <div className="flex flex-col gap-8">
          <div>
            <SeamRule className="w-full" />
            <Spec>Section divider — Crown rule, gold 62° slash, Jacobs rule.</Spec>
          </div>
          <div>
            <SeamBand height={10} />
            <Spec>Band — top of placeholder cards, footer edge, gate page.</Spec>
          </div>
          <div className="split-surface halftone flex h-40 items-center justify-center rounded-card">
            <p className="type-display text-h3 text-white [text-shadow:var(--seam-halo)]">One class</p>
          </div>
          <Spec>Split surface — hero and closing call to action.</Spec>
        </div>
      </Section>

      <Section id="sg-marks" title="School marks (from the 1977 yearbooks) — your decision">
        <div className="grid gap-8 md:grid-cols-3">
          <figure className="card flex flex-col items-center gap-4 p-6 text-center">
            <JacobsMark1977 className="size-40 text-jacobs-brown" />
            <figcaption>
              <p className="font-heading text-lead font-bold text-ink">Jacobs, 1977 mark (recommended)</p>
              <Spec>Printed in the 1977 Eyrie, p. 179; traced to vector. SPEC prefers the period mark.</Spec>
            </figcaption>
          </figure>
          <figure className="card flex flex-col items-center gap-4 p-6 text-center">
            <Image src={modernJacobs} alt="Jacobs High School Golden Eagles, modern logo" className="h-40 w-auto" />
            <figcaption>
              <p className="font-heading text-lead font-bold text-ink">Jacobs, modern mark</p>
              <Spec>The file supplied as assets/brand/HDJ.jpg — post-1977.</Spec>
            </figcaption>
          </figure>
          <figure className="card flex flex-col items-center gap-4 p-6 text-center">
            <CrownVikingMark className="size-40" />
            <figcaption>
              <p className="font-heading text-lead font-bold text-ink">Crown Vikings (original)</p>
              <Spec>The 1977 Valhallan has no emblem — only cover art and a costumed mascot — so this is a simple original helmet, per SPEC.</Spec>
            </figcaption>
          </figure>
        </div>
        <p className="mt-6 measure text-body text-ink">
          Colors sampled from the books: Jacobs cover tan <code>#BB9054</code> (now <code>--jacobs-tan</code>), Jacobs
          endpapers <code>#EAD94A</code>, Crown endpapers <code>#69B2B7</code>. The Crown book has no royal blue to
          sample (its cover is a painting), so <code>--crown-blue</code> is unchanged.
        </p>
      </Section>

      <Section id="sg-duotone" title="Yearbook duotones">
        <DuotoneBand className="rounded-card" />
        <Spec>
          Crown football (Valhallan p. 32) and the Jacobs entrance (Eyrie p. 5), in each school’s colors, split by the
          seam. Picked so no one is recognizable. Used at the top of the Yearbooks page.
        </Spec>
      </Section>

      <Section id="sg-icons" title="Icons">
        <ul className="flex flex-wrap gap-6 text-ink">
          {[
            { Icon: MapPin, label: "Map" },
            { Icon: CalendarPlus, label: "Add to calendar" },
            { Icon: Camera, label: "Upload a photo" },
            { Icon: Copy, label: "Copy code" },
            { Icon: Check, label: "Selected" },
            { Icon: ArrowRight, label: "Continue" },
          ].map(({ Icon, label }) => (
            <li key={label} className="flex flex-col items-center gap-2">
              <Icon size={28} strokeWidth={1.75} aria-hidden="true" />
              <span className="text-small text-muted">{label}</span>
            </li>
          ))}
        </ul>
        <Spec>Lucide, 1.75 stroke. Always paired with a text label.</Spec>
      </Section>

      <Section id="sg-motion" title="Motion">
        <ul className="measure flex list-disc flex-col gap-2 pl-6 text-body text-ink">
          <li>Hero split: 3.4 s, once per browser session, skippable by click, scroll, any key, or the Skip button.</li>
          <li>Section entry: fade-and-rise, 250 ms, ease-out.</li>
          <li>Controls: 180 ms color and press feedback.</li>
          <li>Reduced-motion preference: all of the above are off; the final state shows immediately.</li>
        </ul>
      </Section>
    </div>
  );
}
