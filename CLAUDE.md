# CLAUDE.md — Class of ’77 50-Year Reunion Website

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
| 1 — Foundation & Design System | Plan submitted, awaiting owner approval |
| 2 — Data Layer & Weekend Page | Not started |
| 3 — RSVP (no payment) | Not started |
| 4 — Payments | Not started |
| 5 — Yearbooks (request assets first) | Not started |
| 6 — Directory | Not started |
| 7 — Admin | Not started |
| 8 — Hardening & Launch | Not started |

## Approved deviations from SPEC

_None yet._
