# Class of ’77 — 50-Year Reunion Website

Irving Crown & Harry D. Jacobs High Schools · October 8–10, 2027.

`SPEC.md` is the authoritative build spec. `CLAUDE.md` summarizes rules, stack, tokens, and phase status.

## Run locally

```bash
npm install
npm run db:start              # local Supabase in Docker: applies migrations + seed
cp .env.example .env.local    # set SITE_PASSCODE, SITE_GATE_SECRET, and the SUPABASE_* values
                              # printed by `npx supabase status`
npm run dev                   # http://localhost:3000
```

## Database

| Path | What it is |
|---|---|
| `supabase/migrations/` | Schema (SPEC §16), Row Level Security, storage bucket |
| `lib/content/*-seed.ts` | The only source of seeded facts (SPEC §6) |
| `supabase/seed.sql` | Generated from the above — `npm run db:seed:generate`; never edit by hand |
| `lib/supabase/database.types.ts` | Generated types — `npm run db:types` |

Seeding is idempotent: it never overwrites rows the organizer has edited.

Generate a gate secret with `openssl rand -base64 48`.

## Checks

| Command | What it does |
|---|---|
| `npm run lint` | ESLint (Next.js rules) |
| `npm run typecheck` | TypeScript strict |
| `npm run build` | Production build |
| `npx playwright test --project=chromium` | Gate, hero, weekend, stay, calendar and axe (WCAG 2.2 AA) tests against a production build and the local database |
| `npm run screenshots` | Review screenshots at 375 / 768 / 1440 px and 200 % zoom → `screenshots/phase-2/` |
| `npm run icons` | Regenerate favicon and Apple icon from the monogram geometry |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, build, and the Playwright suite on every push.

## Connecting production Supabase (one time)

1. Create a project at supabase.com (region: US East or US Central).
2. `npx supabase login` → `npx supabase link --project-ref <ref>` → `npx supabase db push --include-seed`.
3. Add the variables below to Vercel and redeploy.

## Deploying on Vercel (preview)

Set these in **Vercel → Project → Settings → Environment Variables** (Preview and Production), then redeploy:

| Variable | Value |
|---|---|
| `SITE_STAGE` | `preview` |
| `SITE_PASSCODE` | The class passcode — a short phrase, not 4 digits |
| `SITE_GATE_SECRET` | 32+ random characters |
| `NEXT_PUBLIC_SITE_URL` | `https://crownjacobs77.com` |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | From Supabase → Project Settings → API |
| `REVALIDATE_SECRET` | 16+ random characters |
| `CRON_SECRET` | 16+ random characters (Vercel uses it to call the daily keep-alive) |

Without them the gate fails closed: every visitor sees “the passcode hasn’t been set up.”
Changing the passcode or the secret signs every device out.
