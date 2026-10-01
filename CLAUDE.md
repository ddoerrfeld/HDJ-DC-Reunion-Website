# CLAUDE.md — Class of ’77 50-Year Reunion Website

@AGENTS.md

**Read `SPEC.md` in full before doing anything.** It is the authoritative spec. This file only summarizes it; if the two disagree, `SPEC.md` wins (unless a deviation below was approved by the owner).

## Working rules (from SPEC §0 and the owner)

1. **Never invent event facts.** Venues, addresses, prices, times come only from SPEC §6 seed data or the admin panel. `TBD` renders as a designed "Details coming soon" placeholder — finished-looking, never a guess.
2. **Anything the organizer might change lives in the database**, not code (items, prices, paid/unpaid, deadline, capacity, FAQ, feature flags).
3. **High-end finish** (SPEC §4.7) applies to every phase. Everything draws from `/styleguide`. One button style per role, one card, one photo frame, Lucide icons at 1.75 stroke.
4. **Audience is ~68 years old.** Accessibility is a hard requirement (SPEC §4.5): 18 px base, 48 px tap targets, visible labels, no hover-only UI, WCAG 2.2 AA, axe clean. Test at 375 px and 200% zoom.
5. **No fake yearbook pages.** At Phase 5, stop and request files from the owner using the SPEC §10.1 checklist. Max 3 grey test images.
6. **Corrected spellings:** Prairie Ridge, Dundee-Crown, Crystal Lake South, Randall Oaks, Pickleball, Pickle Haus.
7. **Event:** Fri Oct 8 – Sun Oct 10, 2027. All times `America/Chicago`.
8. **Site is passcode-gated** in preview (SPEC §12.1, Stage A).
9. **TypeScript strict.** No `any` without an explaining comment. Commit at end of each phase.
10. **Never use Dundee-Crown Chargers identity** (post-1983). Crown = Vikings, royal blue & white. Jacobs = Golden Eagles, brown & gold. No NFL/pro-team marks.
11. Typographic copy: ’77 (right single quote), en dashes for ranges (3:30–4:30 PM), real quotes.
12. **Phase discipline:** build one phase at a time (SPEC §15). At the end of each phase: lint, typecheck, axe; screenshots at 375/768/1440 px and 200% zoom; summarize built/unverified/deviations; commit; **stop and wait for owner approval.** Update the phase status table below.
13. Do not put model identifiers in commits, PRs, or code.

## Stack

Next.js (App Router) + TypeScript strict · Tailwind CSS v4 with CSS-variable brand tokens · Radix primitives only where needed · Supabase (Postgres/Storage/Auth, RLS everywhere) · Resend · Vercel · Cloudflare Worker (yearbook images, signed URLs) · sharp · Tesseract (ingest only) · Playwright + axe for a11y checks. No Stripe (payments cancelled), no Turnstile (replaced by the classmate check).

## Brand tokens (SPEC §4.2 — refine from yearbook scans in Phase 5)

| Token | Value | Use |
|---|---|---|
| `--crown-blue` | `#1F4E9E` | Crown primary; white text OK (7.95:1) |
| `--crown-blue-deep` | `#14336B` | Links on paper, pressed states |
| `--crown-white` | `#FFFFFF` | |
| `--jacobs-brown` | `#4A2C12` | Jacobs primary; white text OK |
| `--jacobs-gold` | `#F0B429` | Fills only — never text on white/paper |
| `--jacobs-tan` | `#BB9054` | 1977 Eyrie cover tan (sampled in Phase 5); outline/accent only (2.58:1 on paper) |
| `--seam-gold` | `#E8A317` | The seam; focus ring (always paired with a dark ring — 1.93:1 on paper alone) |
| `--paper` | `#F7F1E3` | Page background |
| `--ink` | `#1E1B16` | Body text |
| `--muted` | `#5C554A` | Secondary text (6.53:1 on paper) |

Seam angle: **62° from horizontal**, used everywhere (monogram 7 stems, dividers, hero crack).
Fonts (via `next/font`): **Graduate** (display, uppercase, +2% tracking, never body) · **Bitter 700** (H2–H4, card names) · **Source Sans 3** (body/UI).

## Phase status

| Phase | Status |
|---|---|
| 1 — Foundation & Design System | ✅ Approved by owner |
| 2 — Data Layer & Weekend Page | ✅ Approved by owner |
| 3 — RSVP (no payment) | ✅ Approved by owner (production Supabase, Resend, Turnstile keys not yet connected) |
| 4 — Payments | ❌ Cancelled by owner — no payment processor. Paid events show a “Payment details coming soon” placeholder. |
| 5 — Yearbooks | ✅ Approved by owner 2026-10-01. Name search (OCR) turned on. School marks: Jacobs 1977 HDJ mark + original Crown helmet (owner deferred to judgment). |
| 6 — Directory | Not started |
| 7 — Admin | Not started |
| 8 — Hardening & Launch | Not started |

## Approved deviations from SPEC

- **No online payments (owner decision after Phase 3).** SPEC §8 and Phase 4 are cancelled. `requires_payment`/`price_cents` still drive price badges, but registrations are `confirmed` (or `waitlist`); the RSVP review step, confirmation page and email show the `PaymentComingSoon` placeholder instead. No Stripe code, keys, or webhooks. `payments`/`refund_flags` tables remain unused.

- **Classmate check instead of a bot check and a yearbook passcode (owner decision, Phase 5).** RSVP names are matched against the senior roster OCR’d from the yearbooks (`public.classmates`, `lib/classmates/match.ts`: letters-only last names, nickname groups, prefix first names, one-letter OCR slips, maiden/current name). Match → `classmate_status = matched`, yearbooks unlocked. No match → `pending`: RSVP saved, organizer emailed a signed one-click approval link (`/rsvp/approve/[id]?s=`; GET shows details, approval needs a button press). Honeypot field `website`. No roster loaded → everyone `approved`.
- **Yearbook section gate = verified classmates** (not a shared passcode): classmate cookie from the name check on `/yearbooks`, a matched/approved RSVP on the device (RSVP cookie; opening an edit link sets it via `proxy.ts`), enforced in the yearbook pages/actions. Active when `SITE_STAGE=production` and setting `section_gate_enabled` (default on). Preview: `/api/preview/section-gate?on=1|0` toggles it for one device.
- **Yearbook images on a Cloudflare Worker with static assets** (`yearbook-cdn/`), not Supabase Storage/R2: R2 needs a payment method; Supabase free egress (5 GB) is too small. Every request needs an HMAC signature from the site (`lib/yearbook/sign.ts`, expiry end of tomorrow UTC → stable per-day URLs, browser-cacheable). Unsigned/forged/expired → 404. Free tier: 100k requests/day.
- **Image sizes follow the scans:** sources are 1100 px wide, so display = zoom = native WebP + JPEG fallback, thumbnails 240 px (SPEC’s 1600/2800 would be upscales). Names under portraits are readable at zoom on a phone.
- **Thumbnail rail uses `content-visibility: auto` + lazy images** instead of a JS virtualizer (~180 items).
- **Page numbers = position among visible pages** (cover = 1); `?page=N` uses it. Printed page labels are editable later (admin).
- **See Me in ’77 crops are 4:5** (512×640 WebP/JPEG + 160×200), rendered on RSVP save from the yearbook asset (no orphan files). The picker opens on the page where the roster found the person’s name; tap your portrait → pre-zoomed crop.
- **School marks (decided):** Jacobs uses the 1977 interlocked HDJ mark traced from the Eyrie (`JacobsMark1977`), not the modern “J” logo; Crown uses the original Viking helmet (`CrownVikingMark`) since the Valhallan has no emblem. Use them for school badges from Phase 6 on.
- **Hidden pages:** blank endpapers/autograph pages (Jacobs 2–4, 181–183; Crown 2–4, 168–173).

The owner deferred to engineering judgment on every issue flagged in the Phase 1 plan (“do not build to spec if you find a better way”). In effect:

- **Focus ring:** 3 px `--seam-gold` outline over a 2 px `--ink` ring (gold alone fails 3:1 on paper).
- **Hero headline in Bitter 700**, not Graduate (nine-word all-caps sentences read slowly). Graduate stays for “77”, school names, and short labels.
- **Countdown is days only** (no ticking seconds).
- **Passcode field is visible text**, compared case- and whitespace-insensitively.
- **Gate cookie key = SITE_GATE_SECRET + passcode**, so changing the passcode signs out all devices; needs the extra `SITE_GATE_SECRET` env var.
- **Typographic quotes everywhere** (’77), even where SPEC shows '77.
- **Hero adds a visible “Skip intro” button** plus any-key skip, for keyboard and screen-reader users.
- **Monogram is a side-by-side ligature** (shared seam, parallel 62° stems) rather than overlapping/woven 7s — reads as one class split by the seam. Pending owner review on `/styleguide`.
- **Light text that can cross the gold seam gets a tight dark halo** (`--seam-halo`); white on gold is only 2.17:1.
- **Small text floored at 16 px** (scale step would be 14.4 px).
- **Placeholder stub pages** for nav routes not yet built (no 404s from the nav).
- **`event_items.unconfirmed_note`** (added column): admin-editable text shown instead of "To be confirmed" (e.g. "Schedule to be confirmed by the schools") — no hard-coded football logic.
- **Pages refresh every 60 s** (ISR) plus `/api/revalidate` for instant refresh; public reads use the anon key under RLS, never the service role.
- **Seed fallback**: with no Supabase env in *preview*, pages render the SPEC §6 seed; in *production* that is a hard error.
- **Keep-alive cron built in Phase 2** (not 8): the free-tier pause risk starts the day the project is created.
- **Photo uploads go browser → Supabase Storage via signed URL** (Vercel functions cap request bodies at 4.5 MB; SPEC allows 20 MB). Server then verifies by content, decodes HEIC (`heic-convert`), orients, strips all metadata, crops. Abandoned uploads purged daily by the keep-alive cron.
- **Duplicate RSVP tells the submitter** (“you’ve already RSVP’d — we emailed your link”) per SPEC §7.2, reversing the Phase 1 plan’s generic-response idea: the directory already reveals who’s coming, so it hides nothing. Lost-link form stays generic (SPEC §7.3). A new link is issued each time (only hashes are stored).
- **Guest count is 0–4 radio pills**, not a +/− stepper (one tap, clearer for this audience).
- **At least one event is required** to RSVP.
- **After the RSVP deadline**, paid-event selections are frozen on edit; free events and personal details stay editable.
- **Rate limits are Postgres-backed** (`rate_limit_hit`), built in Phase 3 rather than 8; `DISABLE_RATE_LIMITS=1` exists for tests only and is ignored in production.
- **Emails without RESEND_API_KEY (preview only) go to `email_log` with their body** so tests can follow links; real sends log metadata only.
- **Later-phase decisions already made:** recommend dropping the card-surcharge option (Phase 4); custom CSS 3D page flip instead of unmaintained `react-pageflip` (Phase 5); flag R2 vs Supabase egress (Phase 5); Postgres-backed rate limiting (Phase 8).

## Implementation notes

- Next.js 16: middleware is `proxy.ts`. Read `node_modules/next/dist/docs/` before using unfamiliar APIs.
- Domain: **crownjacobs77.com** (registered at Cloudflare; DNS in Cloudflare zone `2b56fbdcd38de5df3d9a7d06aaf6dc1a`). `SITE_URL` in `lib/site.ts`. Vercel project `prj_ocpbHF5JKZJUq5uWB0Y7YkN3TM60` (team `team_O4ABC8YJQOXF48wCGbFEs4TG`), production branch = this working branch. `vercel.json` pins `"framework": "nextjs"` (the project had been created as "Other", which served 404s). Vercel currently redirects apex → www; owner to flip so www → apex (canonical is the apex).
- Vercel env set 2026-09-30: SITE_STAGE=preview, SITE_PASSCODE, SITE_GATE_SECRET, NEXT_PUBLIC_SITE_URL, SUPABASE_URL, REVALIDATE_SECRET, CRON_SECRET, EMAIL_FROM. Owner added SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY on 2026-10-01 (env changes only apply to a new deployment). **Still missing:** RESEND_API_KEY (crownjacobs77.com not yet added/verified in Resend). Turnstile no longer used.
- Production Supabase (`dbaoigdmkfzkxwvzifmq`, us-east-2): four migrations + `seed.sql` applied 2026-09-30 via the Management API (recorded in `supabase_migrations.schema_migrations`); 14 tables, all RLS. Security advisor warnings for anon-executable `is_admin()` / `event_availability()` are by design. Tokens are read from environment variables (`SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN`, `CLOUDFLARE_API_TOKEN` (account token, `cfat_`), `RESEND_API_KEY` (send-only)), never pasted into chat or committed.
- Yearbook pipeline: `npm run yearbook:ingest` (needs `tesseract`; writes `.yearbook-build/`) → `npm run yearbook:roster` → load `.yearbook-build/yearbook.sql` and `roster.sql` into the DB (idempotent) → `npm run yearbook:deploy` (wrangler; `CLOUDFLARE_ACCOUNT_ID=18ae2306c368db82268cdf1f0f59d2c3`). Worker: `crownjacobs77-yearbooks.bzzyz9ftym.workers.dev`; `YEARBOOK_SIGNING_SECRET` is the same in Vercel and the Worker (wrangler secret). Locally/tests: `npm run yearbook:cdn-dev` (same check; Chromium here can’t reach the real Worker through the sandbox proxy).
- Tests: `tests/global-setup.ts` loads 3 grey test pages + roster names Donna Coleman (Crown) / Lynn Bye (Jacobs) only when the DB has no yearbook data (CI); with real data ingested locally the same tests pass. Playwright starts the dev CDN and blanks `RESEND_API_KEY`.
- Yearbook scans: private repo `ddoerrfeld/crownjacobs77-yearbooks` → `/home/user/crownjacobs77-yearbooks` (`add_repo` access: push). **Never copy scans into this repo.** Single pages, 1100 px wide JPEG. Jacobs (“Eyrie 1977”): 184 files; 1 front cover, 2–4 & 181–183 endpapers, 184 back cover, seniors 112–123, period HDJ mark on 179. Crown (“People”, Viking cover art): 174 files; 1 front cover, 2–3 endpapers, 4 blank, 168–173 blank, 174 back cover, seniors 88–103. Contact sheets approved 2026-09-30.
- Data: `lib/data/*.ts` is the only data-access layer (Supabase via `lib/supabase/server.ts`). Seed facts live in `lib/content/*-seed.ts`; `supabase/seed.sql` is generated from them (CI fails if stale).
- Local DB: `npm run db:start` (Docker). If Docker isn’t running in a cloud session: `sudo dockerd &` first. Tests mutate the local DB via `psql` (`tests/db.ts`) and restore it.
- After changing migrations: `npm run db:reset && npm run db:types`.
- Hero: CSS-only timeline in `components/home/hero.css`; `heroBootScript` sets `html[data-hero]` before paint. Default styles are the final state. **The boot script must stay the first child of `<body>`, not in `<head>`**: in `<head>` it caused intermittent production hydration errors (#418) that reset `<html>` attributes.
- RSVP writes go only through SECURITY DEFINER SQL functions (`rsvp_create/update/delete/rotate_token`) callable by the service role. Server code: `app/(site)/rsvp/actions.ts`, `lib/photos.ts`, `lib/email/`. Supabase functions use `search_path = ''`, so compare citext columns with `lower(x::text)`.
- Tailwind v4 theme is locked to brand tokens (`--color-*: initial`, `--text-*: initial`): no off-palette colors or off-scale sizes.
- Playwright is pinned to 1.56.1 to match the preinstalled Chromium (with an `overrides` entry for `playwright-core`).
