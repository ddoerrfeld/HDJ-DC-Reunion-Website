# Class of ’77 — 50-Year Reunion Website

Irving Crown & Harry D. Jacobs High Schools · October 8–10, 2027.

`SPEC.md` is the authoritative build spec. `CLAUDE.md` summarizes rules, stack, tokens, and phase status.

## Run locally

```bash
npm install
cp .env.example .env.local   # then set SITE_PASSCODE and SITE_GATE_SECRET
npm run dev                   # http://localhost:3000
```

Generate a gate secret with `openssl rand -base64 48`.

## Checks

| Command | What it does |
|---|---|
| `npm run lint` | ESLint (Next.js rules) |
| `npm run typecheck` | TypeScript strict |
| `npm run build` | Production build |
| `npx playwright test --project=chromium` | Gate, hero, and axe (WCAG 2.2 AA) tests against a production build |
| `npm run screenshots` | Review screenshots at 375 / 768 / 1440 px and 200 % zoom → `screenshots/phase-1/` |
| `npm run icons` | Regenerate favicon and Apple icon from the monogram geometry |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, build, and the Playwright suite on every push.

## Deploying on Vercel (preview)

Set these in **Vercel → Project → Settings → Environment Variables** (Preview and Production), then redeploy:

| Variable | Value |
|---|---|
| `SITE_STAGE` | `preview` |
| `SITE_PASSCODE` | The class passcode — a short phrase, not 4 digits |
| `SITE_GATE_SECRET` | 32+ random characters |

Without them the gate fails closed: every visitor sees “the passcode hasn’t been set up.”
Changing the passcode or the secret signs every device out.
