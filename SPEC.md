# Build Spec — Class of 1977 50-Year Reunion Website
### Harry D. Jacobs High School (Algonquin, IL) & Irving Crown High School (Carpentersville, IL)

> **For Claude Code.** Save this file at the repo root as `SPEC.md` and reference it from `CLAUDE.md`. Read the whole spec before writing code. Build in the phases defined in §15, in order. At the end of each phase, stop, summarize what was built, list anything unverified, and wait for the owner before starting the next phase.

---

## 0. Ground Rules for the Build

1. **Never invent event facts.** Venues, addresses, prices, times, and the brunch location come only from §6 seed data or the admin panel. Anything marked `TBD` renders as a designed placeholder ("Details coming soon"), never a guess. Placeholders are expected to stay in place for months — they must look intentional and finished, not like a broken page (§4.7).
2. **Everything the organizer might change lives in the database, not in code.** Event items, prices, which activities require payment, RSVP deadline, capacity, FAQ text, and feature toggles are editable in `/admin` without a redeploy. Several of these are still undecided by the organizer (dinner price, whether golf/pickleball are paid, brunch venue).
3. **The finish must be high-end.** This is not a template site. See §4.7 for the quality bar; it applies to every phase, not just a polish pass at the end.
4. **The audience is ~68 years old.** Accessibility is a hard requirement, not polish (§4.5). Test every screen at 375 px wide and at 200% browser zoom.
5. **Yearbook page files are not in the repo yet.** When you reach Phase 5, stop and request them from the owner using the checklist in §10.1. Do not create placeholder "fake" yearbook pages beyond 3 grey test images.
6. **Organizer notes contain typos.** Use corrected spellings: *Prairie Ridge*, *Dundee-Crown*, *Crystal Lake South*, *Randall Oaks*, *Pickleball*.
7. **Event year is 2027** (Class of 1977 + 50). Friday Oct 8, Saturday Oct 9, Sunday Oct 10, 2027 — these weekdays are correct for 2027. All times are `America/Chicago`.
8. **The site is passcode-gated during development** (§12.1). Build the gate in Phase 1.
9. Use TypeScript strict mode. No `any` without a comment explaining why. Commit at the end of each phase with a descriptive message.

---

## 1. Project Context

The Class of 1977 is a split class. The students spent freshman through junior year together at **Irving Crown High School** (Carpentersville). When **Harry D. Jacobs High School** (Algonquin) opened, part of the class moved there for senior year and became Jacobs' **first graduating class**. The rest graduated from Crown. The reunion treats both groups as one class.

Historical notes for copy and design:
- **Irving Crown High School** — opened 1964, closed 1983 when it merged with Dundee Community High School to form **Dundee-Crown High School** (same Kings Road building). Nickname: **Vikings**. Colors: **Royal Blue & White**. The 1976 Crown football team went 8–2.
- **Dundee-Crown's current identity (Chargers, red/royal blue) is post-1983. Do not use it anywhere.** Crown alumni identify as Vikings.
- **Jacobs High School** — nickname **Golden Eagles**, colors **Brown & Gold**. The provided logo (`assets/brand/HDJ.jpg`) is the modern school mark; the 1977 mark may differ (see §4.3).

---

## 2. Scope Summary

| Feature | Summary |
|---|---|
| Home | Hero with the "split" concept, countdown, weekend-at-a-glance, RSVP call to action |
| Weekend | Day-by-day itinerary, add-to-calendar, map links |
| RSVP | Multi-step form: contact info, high school name, school, photo upload, activity selection, guests, payment for paid items |
| Who's Coming | Public attendee directory with search, filters, activity counts |
| Yearbooks | Two flip-book readers (Jacobs '77, Crown '77) with thumbnail rail, zoom, deep links, optional name search |
| See Me in '77 | Attendees link their profile to their own senior photo in the yearbook; directory shows Then & Now (§10.4) |
| Stay | Hotel block and lodging info, fully admin-managed (§6.1) |
| Admin | Event/price editing, RSVP management, headcounts, CSV export, photo moderation, payment status |
| Email | RSVP confirmation with private edit link and calendar file |

Recommended additions (build behind feature flags, default **off**, owner decides): In Memoriam page, FAQ page, yearbook name search (OCR).

---

## 3. Tech Stack & Hosting

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router, latest stable) + TypeScript | Server Actions for form posts |
| Styling | Tailwind CSS + CSS variables for brand tokens | No component library that fights the custom look; headless primitives (Radix) are fine |
| Database / Storage / Admin auth | Supabase (Postgres, Storage, Auth) | Row Level Security on every table |
| Payments | Stripe Checkout (hosted) | Never build a custom card form |
| Email | Resend, sending from the site's own domain | SPF/DKIM/DMARC configured before launch |
| Spam protection | Cloudflare Turnstile on RSVP form | |
| Hosting | Vercel | See hosting caveats below |
| Image processing | `sharp` (server + ingest script), `heic-convert` or equivalent for iPhone photos | |
| Flip book | `page-flip` (StPageFlip) via `react-pageflip`, or equivalent maintained library | Verify maintenance status before choosing; fall back to a custom CSS 3D flip if unmaintained |
| Zoom | `react-zoom-pan-pinch` | Pinch, wheel, double-tap |

**Hosting caveats — flag these to the owner before deploy, do not silently decide:**
- **Supabase free tier pauses projects after a period of inactivity.** A reunion site will have long quiet stretches. Either use the Pro plan or add a scheduled keep-alive (Vercel Cron hitting a lightweight DB query daily). Implement the cron regardless; it's harmless on Pro.
- **Vercel's Hobby plan is limited to non-commercial use.** A site collecting payments may not qualify. Owner must choose Hobby vs. Pro.
- **Stripe account must belong to the organizer/reunion committee**, not the developer, so payouts land in their bank. Build against test keys until the owner supplies live keys.

---

## 4. Brand & Design System

### 4.1 Core Concept — "The Split"

The class story *is* the design: one class, split in 1976, reunited in 2027.

- **The seam.** A single diagonal line runs through the site's visual system. Crown royal blue/white sits on one side (where everyone started); Jacobs brown/gold on the other (where half the class finished). The seam itself is **gold** — the thread that rejoins them.
- **The "77" monogram.** Two interlocking 7s. The left 7 is royal blue with a subtle Viking-helmet horn integrated into the top bar; the right 7 is brown/gold with a subtle wing integrated into the top bar. **The diagonal stroke of each 7 is the seam angle used everywhere else on the site** (pick one angle, ~62° from horizontal, and use it consistently). Build as an inline SVG component with light/dark variants. Keep it original artwork — see §4.3.
- **Hero animation (home page).**
  1. Loads as one solid royal-blue field: "IRVING CROWN · CLASS OF '77 · 1973–1976".
  2. A gold diagonal crack draws across it; the right section recolors to brown/gold: "HARRY D. JACOBS · FIRST GRADUATING CLASS · 1977". The two halves drift apart ~40 px.
  3. The halves slide back together, the gold seam "stitches" closed, and the headline resolves: **"Three years together. One year apart. Fifty years later."** with "October 8–10, 2027" and the RSVP button.
  - Total duration ≤ 3.5 s, plays once per session, skippable by click/scroll.
  - `prefers-reduced-motion`: show the final state immediately, no animation.
- **Reuse the seam** as: section dividers, the directory school-filter toggle (a split pill), the border of attendee cards (blue for Crown grads, gold for Jacobs grads, split border for anyone who marked "Other/attended both"), and the yearbook shelf (two books leaning toward each other).

### 4.2 Color Tokens

Starting values. **Refine by sampling actual 1977 yearbook covers/endsheets once provided (Phase 5)** — 1970s printed blues and golds were warmer than modern screen colors.

```css
:root {
  /* Irving Crown Vikings */
  --crown-blue:        #1F4E9E;  /* royal blue, primary Crown */
  --crown-blue-deep:   #14336B;  /* hover/pressed, text on light */
  --crown-white:       #FFFFFF;

  /* Jacobs Golden Eagles (sampled from provided logo) */
  --jacobs-brown:      #4A2C12;  /* primary Jacobs, body-text-safe */
  --jacobs-gold:       #F0B429;  /* fills only — never text on white */
  --jacobs-tan:        #C9A26B;  /* outline/accent */

  /* Shared */
  --seam-gold:         #E8A317;
  --paper:             #F7F1E3;  /* yearbook-paper page background */
  --ink:               #1E1B16;  /* body text */
  --muted:             #5C554A;  /* secondary text — verify ≥4.5:1 on --paper */
}
```

**Contrast rules (enforce with an automated check in CI — e.g., axe via Playwright):**
- Gold is **never** used as text on white/paper (fails WCAG). Gold backgrounds take brown or ink text.
- Body text: `--ink` on `--paper`. Links: `--crown-blue-deep`, underlined.
- White text allowed on `--crown-blue`, `--crown-blue-deep`, `--jacobs-brown`.

### 4.3 Logos & Marks

- **Jacobs:** `assets/brand/HDJ.jpg` is the modern mark. Recreate as clean SVG for use at small sizes. If the 1977 yearbook shows a different period mark, prefer the period mark and show both to the owner for a decision.
- **Irving Crown:** No usable period logo was found online. **Source it from the 1977 Crown yearbook** (cover, title page, endsheets, athletics section). Crop, clean, and vectorize the best candidate. If none exists, draw an original simple Viking helmet mark in royal blue/white.
- **Do not use or imitate the Minnesota Vikings NFL logo** or any pro-team mark. Original artwork only.
- Keep all source marks in `assets/brand/` with a `README.md` stating origin of each file.

### 4.4 Typography

| Role | Font (Google Fonts, self-hosted via `next/font`) | Usage |
|---|---|---|
| Display | **Graduate** | Varsity block lettering — headlines, "77", section titles. Uppercase, tracked +2%. Never for body text. |
| Headings | **Bitter** (700) | H2–H4, card names |
| Body/UI | **Source Sans 3** | All body copy, forms, buttons |

One typeface per role, used identically on every page.

### 4.5 Accessibility (hard requirements)

- Base font size **18 px**; line height 1.6; max line length ~70 characters.
- Tap targets **≥ 48 × 48 px**. Buttons have text labels, not icon-only.
- Every form input has a visible `<label>` (no placeholder-as-label). Errors appear next to the field in plain words ("Please enter your email address"), plus a summary at the top of the step.
- No hover-only interactions. Everything works by keyboard; visible focus rings (3 px `--seam-gold` outline with dark offset).
- WCAG 2.2 AA minimum. Run axe on every page in CI; zero serious/critical violations to pass a phase.
- Avoid jargon: "Upload a photo," not "Attach media."

### 4.6 Visual Texture

Subtle, not kitsch: a faint paper grain on `--paper` backgrounds, halftone dot pattern (very low opacity) on hero panels, and slightly rounded "yearbook photo" frames for attendee photos. No fake distressed grunge, no disco clip art.

---

### 4.7 Premium Finish — Quality Bar

The site must feel like a custom-commissioned piece from a design studio, not a website builder. Concretely:

- **Art direction before components.** In Phase 1, produce a single static style page (`/styleguide`, admin-only in production) showing type scale, color usage, buttons, form fields, cards, photo frames, the monogram, and the seam treatments. Owner approves it before Phase 2. Every later screen draws only from it.
- **Typographic discipline.** A fixed modular type scale (e.g., 1.25 ratio) with defined sizes only; optical kerning; real typographic quotes and apostrophes (’77, not '77) in all rendered copy; en dashes for ranges (3:30–4:30 PM); no widows in headlines (`text-wrap: balance` for headings, `pretty` for paragraphs).
- **Generous, consistent spacing** on an 8 px grid. White space is a feature. Nothing touches container edges on mobile.
- **Photography treatment.** Yearbook imagery used as texture and storytelling (a duotone of a 1977 hallway or football photo in each school's colors behind section headers), never as clip art. All duotones generated from the owner's yearbook scans in Phase 5; use tasteful neutral placeholders until then.
- **Motion with restraint.** Only purposeful motion: the hero split, page turns, subtle fade-and-rise on section entry (≤ 250 ms, ease-out), and hover/press feedback on controls. No parallax gimmicks, no bouncing. All motion honors `prefers-reduced-motion`.
- **Micro-details.** Custom focus rings, custom checkbox/radio cards (never browser defaults), skeleton loaders shaped like the real content, designed empty states, designed 404 page ("This page must have graduated early"), branded favicon and loading states, smooth anchor scrolling.
- **Designed placeholders.** TBD content renders as an elegant "Details coming soon" card with the seam motif and the line "RSVP’d classmates will be emailed when this is set." Placeholders must look finished.
- **Consistency.** One button style per role, one card style, one photo frame, one icon set (Lucide, 1.75 stroke). No one-off styles.
- **Performance is part of polish.** No layout shift on load (reserve image dimensions), fonts preloaded, no flash of unstyled text, images sharp on retina.
- **Review gate.** At the end of every phase, capture full-page screenshots at 375, 768, and 1440 px and present them to the owner alongside the phase summary.

---

## 5. Pages & Information Architecture

| Route | Purpose |
|---|---|
| `/` | Hero (§4.1), countdown to Oct 8 2027, 3-card weekend overview, "Who's coming" teaser (count + 8 recent photos), RSVP CTA, yearbook CTA |
| `/weekend` | Full itinerary (§6) as three day sections; each item has time, place, description, "Add to calendar" (.ics), "Map" link (Google Maps search URL from address), payment badge if paid |
| `/rsvp` | Multi-step RSVP (§7) |
| `/rsvp/confirmed` | Confirmation summary; payment status; "edit your RSVP" note |
| `/rsvp/edit/[token]` | Edit an existing RSVP via emailed private link (no accounts, no passwords) |
| `/whos-coming` | Attendee directory (§9) |
| `/yearbooks` | Shelf with two books |
| `/yearbooks/[school]` | Reader (§10); `?page=N` deep link |
| `/stay` | Hotel block and lodging (§6.1) |
| `/info` | FAQ, parking, dress, contact organizer (flag-gated; content from admin) |
| `/in-memoriam` | Flag-gated, admin-managed |
| `/admin/*` | Organizer dashboard (§11) |

Global nav: Weekend · Stay · RSVP · Who’s Coming · Yearbooks (+ Info when enabled). Persistent "RSVP" button in header on mobile. Footer: organizer contact email, "Built for the Class of '77."

---

## 6. Event Data (Seed)

Seed into the `event_items` table. **Every item is admin-editable.** `choice_group` makes items mutually exclusive (same time slot); the RSVP form renders each group as a single choice with a "None" option.

Both schools occupy the same buildings and addresses they did in 1977 — use that in copy ("Walk the same halls").

| Day | Time | Item | Location | Address | choice_group | Paid | Notes |
|---|---|---|---|---|---|---|---|
| Fri Oct 8 | 3:30–4:30 PM | School Tour — Jacobs | Harry D. Jacobs High School | 2601 Bunker Hill Dr, Algonquin, IL 60102 | `fri_tour` | No | "Walk the halls where the first Jacobs class finished." |
| Fri Oct 8 | 3:30–4:30 PM | School Tour — Crown | Irving Crown building (today Dundee-Crown High School) | 1500 Kings Rd, Carpentersville, IL 60110 | `fri_tour` | No | "Walk the halls where it all started." |
| Fri Oct 8 | 5:00 PM | Pre-Game Drink | Scorched Earth Brewing Co. | 203 Berg St, Algonquin, IL 60102 | — | No | Pay your own tab. No kitchen on site (food trucks/outside food) — mention in description. |
| Fri Oct 8 | 7:00 PM | Football: Jacobs vs. Prairie Ridge | Jacobs High School | 2601 Bunker Hill Dr, Algonquin, IL 60102 | `fri_game` | No | Halftime recognition of the class |
| Fri Oct 8 | 7:00 PM | Football: Dundee-Crown vs. Crystal Lake South | Dundee-Crown High School | 1500 Kings Rd, Carpentersville, IL 60110 | `fri_game` | No | Halftime recognition of the class |
| Sat Oct 9 | 11:00 AM–3:00 PM | Golf | Randall Oaks Golf Club | 4101 Binnie Rd, West Dundee, IL 60118 | `sat_day` | **TBD** | `requires_payment=false`, `price_cents=null` until set |
| Sat Oct 9 | 11:00 AM–3:00 PM | Pickleball & Social | Pickle Haüs | 1621 S Randall Rd, Algonquin, IL 60102 | `sat_day` | **TBD** | Same as golf. Venue name is styled "Pickle Haüs." |
| Sat Oct 9 | 6:30–10:30 PM | Reunion Dinner | West Dundee VFW Post 2298 | 117 S 1st St, West Dundee, IL 60118 | — | **Yes** | Price TBD; cash bar. Venue identity pending organizer confirmation (flag `confirmed=false`). |
| Sun Oct 10 | TBD | Farewell Breakfast/Brunch | TBD | TBD | — | No | Designed "Location coming soon" placeholder |

**Important behaviors:**
- The 2027 football schedule is not confirmed. Show a small "Schedule to be confirmed by the schools" note on both games until admin toggles `confirmed=true`.
- **Halftime recognition** is the reason the organizer wants game counts. On the game step, add a checkbox: *"I plan to walk onto the field at halftime to be recognized."* This is the number the organizer actually needs for coordinating with the schools — people in the stands ≠ people on the field.
- Every item has a `confirmed` flag. Unconfirmed items show a subtle "To be confirmed" tag; admin clears it when final.
- Tour items share a time slot; if the organizer actually intends them sequentially, admin clears `choice_group` and both become independent checkboxes. No code change needed.

### 6.1 Stay — Hotel Block (`/stay`)

Expect one or more hotel room blocks; details come later. Build the page and admin editor now, with designed placeholders until data exists.

`lodging` table (admin-managed, multiple rows, sortable):
| Field | Notes |
|---|---|
| Hotel name, address, phone | Address drives "Map" and "Directions" links |
| Is official block | Official blocks get a featured, full-width card; other nearby options get smaller cards |
| Group code / block name | Displayed prominently with a one-tap "Copy code" button |
| Booking URL | Large "Book your room" button (opens hotel's site in a new tab) |
| Group rate text | Free text (e.g., "$129/night + tax") — don't compute |
| Cutoff date | Shows a countdown chip ("Rate held until Sept 8 — 23 days left") and switches to "Block closed — call the hotel" after the date |
| Drive times | Free text to key venues (e.g., "8 min to the VFW") |
| Photo | Optional, uploaded in admin |
| Notes | Markdown (shuttle, breakfast, parking) |
| Visible | Toggle |

Also:
- Link from the confirmation email and confirmation page: "Need a room? See the hotel block."
- Show a compact "Where to stay" callout on the home page once an official block exists.
- Empty state (no rows yet): elegant placeholder — "A hotel room block is being arranged. Check back soon."

---

## 7. RSVP Flow

One RSVP per classmate. Spouses/partners/friends who are not classmates are **guests** on that RSVP. If two classmates are married to each other, each RSVPs separately so both appear in the directory — the guest step says so explicitly.

### 7.1 Steps (progress bar with step names, Back/Next, state persisted in `sessionStorage` so a refresh doesn't wipe it)

**Step 1 — About You**
| Field | Required | Notes |
|---|---|---|
| First name | Yes | |
| Last name in high school | Yes | Label: "Your last name in high school (maiden name, if it's changed)." Help text explains classmates will find you by this name. |
| Current last name | Only if different | Checkbox "My last name has changed since high school" reveals the field |
| Nickname / went by | No | e.g., "Sue," "Chip" — searchable |
| Email | Yes | Used for confirmation and edit link; never public |
| Phone | No | Never public |
| City, State | No | Never public (organizer use) |
| Graduated from | Yes | Radio: **Jacobs '77** · **Crown '77** · **Attended with the class but graduated elsewhere / didn't graduate** |

**Step 2 — Photo (optional)**
- Upload from phone or computer. Accept JPEG, PNG, **HEIC/HEIF (iPhone default — must work)**, WebP; max 20 MB.
- In-browser square crop (`react-easy-crop`), with rotate.
- Server: convert to WebP (512 px and 160 px) + JPEG fallback, **strip all EXIF including GPS location**, store in Supabase Storage.
- Text: "A current photo helps classmates recognize you. You can skip this."

**Step 3 — Your Weekend**
Grouped by day. `choice_group` items as large radio cards (including "Not attending"); independent items as large checkbox cards. Each card shows time, place, and price badge if paid. Game step includes the halftime checkbox (§6).

**Step 4 — Guests**
- For each selected item where `allows_guests=true`: "How many guests will join you?" (stepper 0–4) plus guest first/last names (names only needed for paid items — used for name tags/check-in).
- Note: "Is your guest also a Class of '77 classmate? Please have them RSVP on their own so they appear on Who's Coming."

**Step 5 — Privacy & Review**
- Checkbox (default **checked**, clearly worded): "Show me on the Who's Coming page (name, photo, school, and activities only)."
- Full review of all entries with "Edit" links to each step.
- Turnstile challenge.
- Button text: "Continue to Payment" if any paid item selected, otherwise "Submit RSVP."

### 7.2 Submission Logic
1. Validate server-side (Zod schemas shared with client).
2. Deduplicate: if the email already has an RSVP, do not create a second — tell the user and resend their edit link.
3. Create `attendee` + `registrations` with `status='pending_payment'` if payment required, else `'confirmed'`.
4. If payment required → Stripe Checkout (§8). Otherwise → confirmation page + email.
5. **Abandoned payment:** the RSVP is saved but shows as "Payment pending." Confirmation email includes a "Complete payment" link. Admin sees unpaid list. Unpaid attendees still appear in the directory for free activities but are **not** counted as dinner headcount until paid.

### 7.3 Editing
- Emailed link `/rsvp/edit/[token]` (token: 32+ random bytes, stored hashed, no expiry until event ends). "Lost your link?" form resends it to the email on file (rate-limited, generic response that doesn't reveal whether an email exists).
- Adding a paid item or guests → new Checkout for the difference only.
- Removing a paid item → does **not** auto-refund; flags it for organizer in admin with a note to the attendee: "The organizer will contact you about a refund." Refund policy text + cutoff date are admin settings.

### 7.4 Deadlines & Capacity
- `rsvp_deadline` setting closes new RSVPs and paid-item changes after the date (edits of name/photo stay open).
- Per-item optional `capacity`. When reached, the item shows "Full — join the waitlist" and records a waitlist registration (no charge).

---

## 8. Payments

- Stripe Checkout, one session per payment, line items built server-side from DB prices (never trust client prices).
- Line items: each paid event × (1 attendee + guest count).
- **Processing fee setting** (admin): absorb fees, or add a transparent "Card processing fee" line item. Default: absorb. (Stripe's standard US rate is roughly 2.9% + $0.30 per card charge — organizer should confirm their account's rate.)
- **Pay-by-check / pay-at-door setting** (admin toggle, default off). If on, the payment step offers "I'll pay by check" — RSVP saved as `pending_offline`; admin marks paid manually.
- Webhook `/api/stripe/webhook`: verify signature; handle `checkout.session.completed` and `checkout.session.expired`; idempotent on event ID; update `payments` and registration status; send receipt/confirmation email.
- Payments table records amount, Stripe session and payment-intent IDs, and line items JSON for reconciliation.
- If `requires_payment` is enabled later for golf/pickleball, existing RSVPs for those items become `pending_payment` for that item only, and admin gets a "Send payment requests" button that emails each affected attendee a pay link. Confirm with owner before sending.

---

## 9. Who's Coming (Directory)

### 9.1 Public Data — strictly limited
Only these fields ever leave the server for the public directory: **display name, photo, graduating school, selected activities, and (if the attendee linked one) their ’77 yearbook portrait crop and page link.** The yearbook link is attendee-initiated, so it's within the owner's intent for public data. Implement as a Postgres **view** (`public_directory`) exposing only those columns for attendees with `show_in_directory=true` and a non-cancelled RSVP. The anon role has **no** SELECT on `attendees` — only on the view. Guests are not listed. Halftime-walk flag, email, phone, city, payment status are never public.

**Display name convention** (standard reunion format): `First (HighSchoolLast) CurrentLast` when the name changed — e.g., *Susan (Miller) Johnson* — otherwise `First Last`. Show nickname in quotes if provided: *Robert "Chip" Anderson*.

### 9.2 Layout
- Responsive card grid (1 col mobile, 2 tablet, 3–4 desktop). Card: photo in yearbook-style frame (monogram placeholder in school color if no photo), Then & Now flip when linked (§10.4), name, school badge, activity chips.
- Summary bar at top: total attending, count per school, count per activity (clicking a count applies that filter).

### 9.3 Search & Filters
- **Search box** (instant, debounced): matches first name, high-school last name, current last name, and nickname; accent/case-insensitive; partial match.
- **School filter**: split-pill toggle — All · Crown · Jacobs · Other.
- **Activity filter**: multi-select chips with counts; "match any" by default, toggle for "match all" (e.g., "who's doing golf AND dinner").
- **Day filter**: Friday / Saturday / Sunday (anyone with at least one activity that day).
- **Has photo** toggle and **Has a ’77 photo** toggle.
- **Sort**: High-school last name (default, A–Z) · Current last name · Recently RSVP'd.
- **A–Z jump bar** by high-school last name on desktop.
- Filter state lives in the URL query string (shareable, back-button safe). "Clear all filters" button always visible when any filter is active.
- Empty state: "No one matches yet — share the site with classmates!" with a copy-link button.

> Location-based filtering ("coming from out of state") was intentionally excluded because city is not public. If the owner wants it later, it requires a separate opt-in field.

---

## 10. Yearbook Readers

### 10.1 Asset Handoff — STOP and request from owner at Phase 5
Ask the owner for:
1. One folder per book: `yearbooks/jacobs-1977/`, `yearbooks/crown-1977/`.
2. Confirmation of file naming/order (ideally zero-padded: `001.jpg`, `002.jpg` …). If names are camera defaults (`IMG_####`), confirm that sort order equals page order.
3. Whether files are **single pages or two-page spreads** (affects splitting).
4. Which files are front cover, inside covers, and back cover.
5. Any pages to exclude (blank pages, damaged pages).

Then run the ingest script and show the owner a contact sheet (grid of all thumbnails with page numbers) for each book **before** building the reader against it.

### 10.2 Ingest Pipeline — `scripts/ingest-yearbook.ts`
For each page:
- Auto-orient from EXIF; optional auto-crop of scanner/phone margins (flag pages where crop confidence is low for manual review rather than cropping blindly).
- If spreads: split into left/right pages.
- Generate: **thumb** (240 px wide WebP), **display** (1600 px WebP + JPEG fallback), **zoom** (2800 px WebP). Record width/height.
- Upload to Supabase Storage (or Cloudflare R2 if storage cost/egress is a concern — flag to owner) with long-cache headers.
- Write a manifest (`yearbook_pages` table): school, sequence, printed page label (editable in admin, since printed page numbers rarely match file order), asset URLs, dimensions.
- Optional OCR (flag-gated): run Tesseract on the zoom image, store text in `ocr_text` with a Postgres full-text index. Senior portrait pages usually OCR names reasonably well; results will be imperfect.
- Script is idempotent (re-running skips processed pages unless `--force`).

Do **not** bundle yearbook images into the Next.js deployment or route them through Vercel's on-demand image optimizer — pre-generated sizes only, served directly from storage/CDN.

### 10.3 Reader UX — `/yearbooks/[school]`
- **Book view (desktop/tablet landscape):** two-page spread with realistic page-turn (drag corner or click edges), cover shown single-page. **Mobile/portrait:** single page with swipe.
- **Thumbnail rail:** collapsible panel on the left (desktop) / bottom sheet (mobile) with a virtualized vertical list of thumbnails and page labels; current page highlighted and auto-scrolled into view; click jumps directly (no flipping animation through 80 pages — jump instantly, then animate the final turn only).
- **Controls (large, labeled):** Previous · Next · page number input "Go to page" · Zoom · Thumbnails toggle · Full screen · Share this page (copies URL with `?page=N`).
- **Zoom mode:** opens the current page at the zoom resolution with pinch/scroll zoom, pan, double-tap to zoom; essential for reading names under senior portraits.
- Keyboard: ←/→ turn pages, Home/End, `Z` zoom, `T` thumbnails, Esc exits zoom/fullscreen.
- Preload adjacent ±2 pages at display size; lazy-load everything else.
- **Name search (if OCR enabled):** search box → list of matching pages with a text snippet → click jumps to page.
- Book switcher: "Switch to the Crown '77 / Jacobs '77 yearbook" button in the header.

### 10.4 See Me in ’77 (core feature)

Attendees connect their directory profile to their own senior portrait in the yearbook, producing a **Then & Now** card.

**Flow** (available in RSVP Step 2 and on the edit page once yearbooks are ingested; optional; can be done later via the edit link — the confirmation email should invite them back to do it):
1. "Find yourself in the ’77 yearbook." Book defaults to their graduating school; they can switch books (some classmates may appear in the other school's book — allow either).
2. Pick the page using the same thumbnail rail as the reader (with name search when OCR is on — this is where OCR earns its keep; senior pages are alphabetical, so also offer a "Jump to seniors" shortcut per book, set in admin as a page range).
3. Drag/resize a crop box around their own portrait on the zoom-resolution page (`react-easy-crop` with free aspect lock at the yearbook portrait ratio; pinch-zoom on mobile). Big "Looks right" / "Try again" buttons.
4. Store page reference + normalized crop rectangle (0–1 coordinates). Server renders the crop to a 512 px WebP ("then" image) — derived from the yearbook asset, never re-uploaded by the user.

**Display:**
- Directory card shows the **Now** photo (their upload) by default with a small "’77" tab; tapping/clicking the card photo flips to the **Then** portrait with a restrained 3D card-flip (cross-fade under reduced motion). Must work by tap and keyboard, not hover.
- If they linked a yearbook photo but uploaded no current photo, show the Then portrait with a "’77" tag.
- A "See me in ’77" link on the card opens the reader at that page with their crop region briefly highlighted (gold outline, fades after 2 s).
- Directory filter: "Has a ’77 photo" toggle.

**Rules:**
- Attendee-selected only. No face detection or automatic matching.
- Admin can clear or correct any crop (§11).
- If the yearbooks are gated or removed, Then images follow the same access rules as the yearbooks.

---

## 11. Admin (`/admin`)

Supabase Auth, email magic link, allowlist of admin emails in settings. RLS policies restrict admin tables to authenticated admins.

- **Dashboard:** total RSVPs, by school, per-item headcount (attendees + guests), **halftime walkers per game**, dinner paid vs. unpaid, revenue collected, waitlists.
- **Event items:** edit all §6 fields, reorder, show/hide, set price/requires_payment/capacity/confirmed.
- **RSVPs:** searchable table; view/edit any RSVP; mark offline payment received; cancel; resend edit link; view Stripe payment link.
- **Photo moderation:** grid of uploaded photos with Hide/Restore. Hidden photos fall back to monogram placeholder.
- **Exports (CSV):** full attendee list (private fields included), per-event roster with guest names (for check-in and name tags, sorted by high-school last name), dinner payment report, halftime list per game.
- **Settings:** RSVP deadline, refund policy text, fee handling, pay-offline toggle, feature flags (§2), Stage B section passcode + on/off (§12.1), organizer contact email, FAQ content (Markdown).
- **Yearbooks:** edit printed page labels, hide pages, set each book's "seniors" page range, review/clear/correct any attendee's See Me in ’77 crop.
- **Stay:** full CRUD for lodging rows (§6.1), with preview.
- **In Memoriam** (if enabled): add name, school, optional photo and years. Admin-only entry — no public submissions.

---

## 12. Privacy & Security

### 12.1 Access Gating — two stages

**Stage A — Development / preview (now, until the site moves to the real domain):**
- **One site-wide passcode gate** via Next.js middleware covers every public route (home, weekend, stay, RSVP, directory, yearbooks). Admin routes keep their own login.
- Passcode set by env var `SITE_PASSCODE`; after one correct entry, an httpOnly signed cookie keeps that device unlocked for 180 days — organizers enter it once per device, not per visit.
- **Yearbooks and Who's Coming have no additional gate in this stage.** Organizers must be able to click through all functionality freely.
- Whole site sends `X-Robots-Tag: noindex, nofollow` and `robots.txt` disallows all.
- Stripe runs in **test mode** only. Show a thin, tasteful "Preview — test payments only" ribbon so nobody mistakes it for live.
- Gate page is designed to the same standard as the rest of the site (monogram, seam, one field, one button) — it's the first thing organizers will see.

**Stage B — Production domain (launch):**
- Controlled by env var `SITE_STAGE=preview|production`, not by code edits.
- Site-wide gate turns **off**; home, weekend, stay, and RSVP are public and indexable.
- **Section gate** for `/yearbooks/*`, `/whos-coming`, and Then images — admin setting, **default ON**, separate class passcode (hashed in `settings`), same 180-day cookie. Rationale: the yearbooks contain every classmate's photo, including people who never opted in, and the directory shows who will be away from home on known dates. The organizer distributes the passcode via the class Facebook group/email. Be honest in copy: this deters casual access and indexing; it is not high security.
- Stripe switches to live keys (owner-provided).

### 12.2 General

- `noindex` on gated pages and on `/rsvp/edit/*` and `/admin/*` in every stage.
- RLS on every table; anon key can only insert RSVPs through a server action (never direct table insert from the browser) and read `public_directory`.
- Rate-limit RSVP submit, edit-link resend, and passcode attempts.
- Store only what's in §7.1. No birthdates, no home addresses.
- Photo EXIF stripped (§7.1). Uploaded file type verified by content, not extension.
- "Delete my RSVP" option on the edit page (removes photo and personal data; retains anonymized payment record for accounting).

---

## 13. Email

Via Resend, from `reunion@<domain>` with reply-to set to the organizer's email.
- **RSVP confirmation:** summary of selections and guests, payment status, private edit link, `.ics` attachment containing each selected item.
- **Payment receipt:** amount, items, Stripe receipt link.
- **Payment pending:** sent immediately if checkout is abandoned/expired, with pay link.
- **Edit-link resend.**
- Plain, large-text HTML templates in brand colors with a text-only fallback. No marketing blasts from this system — admin exports CSV for any mass communication.

---

## 14. Performance, SEO, Sharing

- Lighthouse (mobile) ≥ 90 on Performance, Accessibility, Best Practices for Home, Weekend, RSVP.
- Open Graph image: the split "77" monogram on the seam with "Class of '77 · 50-Year Reunion · Oct 8–10, 2027" — this is what shows when the link is shared on Facebook/texts, which is how most classmates will arrive. Make it excellent.
- Favicon/app icon from the monogram.
- Structured data (`Event`) on `/weekend`.
- Error monitoring (Sentry or Vercel's built-in) and a simple uptime check.

---

## 15. Build Phases & Acceptance Criteria

**Phase 1 — Foundation & Design System**
Scaffold, Stage A site-wide passcode gate (§12.1), tokens, fonts, `/styleguide` (§4.7), layout, nav/footer, "77" monogram SVG, hero animation (with reduced-motion path), designed gate page, home page with designed placeholders, 404 page.
✅ Owner approves `/styleguide` · gate remembers device for 180 days · hero plays once, is skippable, reduced-motion shows final state · axe clean · screenshots at 375/768/1440 px and 200% zoom delivered.

**Phase 2 — Data Layer & Weekend Page**
Supabase schema (§16), RLS, seed data (§6), `/weekend` rendering from DB, `.ics` generation, map links, `/stay` page with designed empty state.
✅ Changing an item in the DB updates the page with no deploy · TBD fields render the designed placeholder · `/stay` renders correctly with 0, 1 official, and 3 mixed lodging rows.

**Phase 3 — RSVP (no payment)**
All steps, validation, HEIC upload + crop + EXIF strip, dedupe, confirmation email, edit link flow, Turnstile.
✅ iPhone HEIC upload works end-to-end · GPS EXIF confirmed absent on stored file · edit link round-trip works · Playwright test covers a full RSVP.

**Phase 4 — Payments**
Stripe Checkout, webhook, pending/abandoned handling, add-on payments on edit, offline-payment toggle, fee setting.
✅ Test-mode card succeeds and marks paid · expired session leaves RSVP as pending and sends pay link · webhook replay is idempotent · prices cannot be altered from the client.

**Phase 5 — Yearbooks** *(stop and request assets per §10.1 first)*
Ingest script, contact sheets for owner review, reader, thumbnail rail, zoom, deep links, OCR (if flag on), sample-and-refine brand colors from covers, extract period logos, generate duotone section imagery (§4.7), See Me in ’77 selection + crop flow (§10.4).
✅ Owner approves contact sheets · deep link `?page=N` opens correct page · jump from thumbnail is instant · readable names at zoom on a phone · an attendee can find and crop their senior portrait on a phone in under 2 minutes.

**Phase 6 — Directory**
`public_directory` view, grid, Then & Now card flip, search, filters, sort, counts, URL state. Stage B section gate built but inactive while `SITE_STAGE=preview`.
✅ Network inspector shows no private fields in any directory response · search finds people by high-school last name, current last name, and nickname · filters combine correctly · Then & Now flip works by tap and keyboard.

**Phase 7 — Admin**
Everything in §11.
✅ Organizer can change dinner price, turn on golf payment, export check-in roster, and see halftime counts without touching code.

**Phase 8 — Hardening & Launch**
Rate limits, error monitoring, keep-alive cron, email domain auth, OG image, Lighthouse, full accessibility pass, launch checklist document for the organizer (how to use admin, in plain language). **Cutover:** set `SITE_STAGE=production` on the real domain, verify site-wide gate off, section gate on (unless owner decides otherwise), live Stripe keys, indexing enabled for public pages only, test-data purge from the database.
✅ All acceptance criteria above re-verified on production URL.

---

## 16. Data Model (starting point — refine as needed, keep names)

```
settings            (key text pk, value jsonb)
event_items         (id, slug, day date, starts_at timestamptz, ends_at timestamptz null,
                     title, description_md, location_name, address null, choice_group null,
                     address_confirmed bool,
                     requires_payment bool, price_cents int null, allows_guests bool,
                     capacity int null, confirmed bool, halftime_eligible bool,
                     visible bool, sort int)
attendees           (id uuid, first_name, hs_last_name, current_last_name null, nickname null,
                     email citext unique, phone null, city null, state null,
                     grad_school enum('crown','jacobs','other'),
                     photo_path null, photo_hidden bool, show_in_directory bool,
                     yearbook_page_id fk null, yearbook_crop jsonb null  -- {x,y,w,h} 0–1,
                     then_photo_path null,
                     edit_token_hash, status enum('active','cancelled'),
                     created_at, updated_at)
registrations       (id, attendee_id fk, event_item_id fk, guest_count int,
                     halftime_walk bool, status enum('confirmed','pending_payment',
                     'pending_offline','waitlist','cancelled'), created_at)
guests              (id, registration_id fk, first_name, last_name)
payments            (id, attendee_id fk, stripe_session_id, stripe_payment_intent_id null,
                     amount_cents, fee_cents, status, line_items jsonb, created_at)
refund_flags        (id, attendee_id, registration_id, reason, resolved bool, created_at)
yearbook_pages      (id, school, seq int, page_label text, thumb_url, display_url,
                     display_jpg_url, zoom_url, width, height, hidden bool,
                     ocr_text text null, ocr_tsv tsvector null)
memoriam            (id, name, grad_school, photo_path null, note null, sort)
lodging             (id, name, address, phone null, is_official_block bool, group_code null,
                     booking_url null, rate_text null, cutoff_date date null,
                     drive_times_md null, photo_path null, notes_md null, visible bool, sort)
yearbook_books      (school pk, title, seniors_start_seq int null, seniors_end_seq int null)
admin_users         (email citext pk)
view public_directory (attendee_id, display_name, photo_url, then_photo_url,
                       yearbook_school, yearbook_page_seq, yearbook_crop,
                       grad_school, activities jsonb[] -- slugs + titles only)
```

---

## 17. Open Items — Organizer Must Supply (placeholders stay until then)

1. Dinner price per person; refund policy and cutoff date.
2. Whether golf and/or pickleball will charge, and how much.
3. Whether the two school tours run simultaneously (choose one) or back-to-back (can do both).
4. Confirm the dinner venue is West Dundee VFW Post 2298 (117 S 1st St) — the organizer's note says only "VFW Dundee."
5. Sunday brunch venue and time.
6. Hotel block details (§6.1).
7. RSVP deadline; any capacity caps (VFW hall, golf tee times).
8. Confirmation of the 2027 football opponents/dates from the schools.
9. Stripe account (organizer-owned) and live keys; organizer contact email; production domain.
10. Stage B section passcode on or off at launch, and the passcode.
