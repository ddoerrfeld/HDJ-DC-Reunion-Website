# CLAUDE.md — Class of ’77 50-Year Reunion Website

@AGENTS.md

**Read `SPEC.md` in full before doing anything.** It is the authoritative spec. This file only summarizes it; if the two disagree, `SPEC.md` wins (unless a deviation below was approved by the owner).

## Working rules (from SPEC §0 and the owner)

1. **Never invent event facts.** Venues, addresses, prices, times come only from SPEC §6 seed data or the admin panel. `TBD` renders as a designed "Details coming soon" placeholder — finished-looking, never a guess.
2. **Anything the organizer might change lives in the database**, not code (items, prices, paid/unpaid, deadline, capacity, FAQ, feature flags).
3. **High-end finish** (SPEC §4.7) applies to every phase. Everything draws from `/styleguide`. One button style per role, one card, one photo frame, Lucide icons at 1.75 stroke.
4. **Audience is ~68 years old.** Accessibility is a hard requirement (SPEC §4.5): 18 px base, 48 px tap targets, visible labels, no hover-only UI, WCAG 2.2 AA, axe clean. Test at 375 px and 200% zoom.
5. **No fake yearbook pages.** At Phase 5, stop and request files from the owner using the SPEC §10.1 checklist. Max 3 grey test images.
6. **Corrected spellings:** Prairie Ridge, Dundee-Crown, Crystal Lake South, Randall Oaks, Pickleball, Pickle Haüs.
7. **Event:** Fri Oct 8 – Sun Oct 10, 2027. All times `America/Chicago`.
8. **Site is passcode-gated** in preview (SPEC §12.1, Stage A).
9. **TypeScript strict.** No `any` without an explaining comment. Commit at end of each phase.
10. **Never use Dundee-Crown Chargers identity** (post-1983). Crown = Vikings, royal blue & white. Jacobs = Golden Eagles, brown & gold. No NFL/pro-team marks.
11. Typographic copy: ’77 (right single quote), en dashes for ranges (3:30–4:30 PM), real quotes.
12. **Phase discipline:** build one phase at a time (SPEC §15). At the end of each phase: lint, typecheck, axe; screenshots at 375/768/1440 px and 200% zoom; summarize built/unverified/deviations; commit; **stop and wait for owner approval.** Update the phase status table below.
13. Do not put model identifiers in commits, PRs, or code.

## Stack

Next.js (App Router) + TypeScript strict · Tailwind CSS v4 with CSS-variable brand tokens · Radix primitives only where needed · Supabase (Postgres/Storage/Auth, RLS everywhere) · Stripe Checkout (hosted, test mode until launch) · Resend · Cloudflare Turnstile · Vercel · sharp · Playwright + axe for a11y checks.

## Brand tokens (SPEC §4.2 — refine from yearbook scans in Phase 5)

| Token | Value | Use |
|---|---|---|
| `--crown-blue` | `#1F4E9E` | Crown primary; white text OK (7.95:1) |
| `--crown-blue-deep` | `#14336B` | Links on paper, pressed states |
| `--crown-white` | `#FFFFFF` | |
| `--jacobs-brown` | `#4A2C12` | Jacobs primary; white text OK |
| `--jacobs-gold` | `#F0B429` | Fills only — never text on white/paper |
| `--jacobs-tan` | `#C9A26B` | Outline/accent (not text on paper, 2.1:1) |
| `--seam-gold` | `#E8A317` | The seam; focus ring (always paired with a dark ring — 1.93:1 on paper alone) |
| `--paper` | `#F7F1E3` | Page background |
| `--ink` | `#1E1B16` | Body text |
| `--muted` | `#5C554A` | Secondary text (6.53:1 on paper) |

Seam angle: **62° from horizontal**, used everywhere (monogram 7 stems, dividers, hero crack).
Fonts (via `next/font`): **Graduate** (display, uppercase, +2% tracking, never body) · **Bitter 700** (H2–H4, card names) · **Source Sans 3** (body/UI).

## Phase status

| Phase | Status |
|---|---|
| 1 — Foundation & Design System | Built — awaiting owner approval of `/styleguide` and screenshots |
| 2 — Data Layer & Weekend Page | Not started |
| 3 — RSVP (no payment) | Not started |
| 4 — Payments | Not started |
| 5 — Yearbooks (request assets first) | Not started |
| 6 — Directory | Not started |
| 7 — Admin | Not started |
| 8 — Hardening & Launch | Not started |

## Approved deviations from SPEC

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
- **Later-phase decisions already made:** HEIC decoded server-side before the crop step (Phase 3); generic “we’ve emailed your link” response on duplicate RSVP (Phase 3); recommend dropping the card-surcharge option (Phase 4); custom CSS 3D page flip instead of unmaintained `react-pageflip` (Phase 5); flag R2 vs Supabase egress (Phase 5); Postgres-backed rate limiting (Phase 8).

## Implementation notes

- Next.js 16: middleware is `proxy.ts`. Read `node_modules/next/dist/docs/` before using unfamiliar APIs.
- Event facts: `lib/content/event-seed.ts` (SPEC §6 only) behind `lib/data/events.ts` — Phase 2 swaps the data source to Supabase without touching callers.
- Hero: CSS-only timeline in `components/home/hero.css`; `heroBootScript` sets `html[data-hero]` before paint. Default styles are the final state.
- Tailwind v4 theme is locked to brand tokens (`--color-*: initial`, `--text-*: initial`): no off-palette colors or off-scale sizes.
- Playwright is pinned to 1.56.1 to match the preinstalled Chromium (with an `overrides` entry for `playwright-core`).
