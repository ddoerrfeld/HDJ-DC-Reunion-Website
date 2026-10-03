/**
 * Phase 7 review screenshots: the organizer pages and the two optional public
 * pages, at 375 / 768 / 1440 px and 200 % zoom, with fictional data.
 * Run: SHOT_DIR=phase-7 npx playwright test tests/admin.screenshots.spec.ts --project=screenshots
 */
import { test, type Page } from "@playwright/test";
import { clearDirectory, revalidate, seedDirectory, sql } from "./db";
import { unlock } from "./helpers";

const OUT = `screenshots/${process.env.SHOT_DIR ?? "phase-7"}`;
const ADMIN = "adm-shots@example.com";
const SIZES = [
  { name: "375", viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 },
  { name: "768", viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1 },
  { name: "1440", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: "1440-zoom200", viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 },
];

let ids: Record<string, string> = {};
let events = "";
let settings = "";

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(ADMIN);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await page.getByText("Check your email").waitFor();
  const body = sql(`select body_text from public.email_log where to_email = '${ADMIN}' and template = 'admin-login' order by created_at desc limit 1`);
  const url = new URL(/https?:\/\/\S+\/admin\/login\/verify\?token=[A-Za-z0-9_-]+/.exec(body)![0]);
  await page.goto(`${url.pathname}${url.search}`);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
}

async function shot(page: Page, name: string, size: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${OUT}/${name}-${size}.png`, fullPage: true });
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  events = sql("select json_agg(e) from public.event_items e");
  settings = sql("select json_agg(s) from public.settings s");
  ids = await seedDirectory();
  sql(`insert into public.admin_users (email) values ('${ADMIN}') on conflict do nothing`);
  sql("update public.event_items set price_cents = 8500 where slug = 'sat-dinner'");
  sql(`update public.registrations set paid_at = now() where attendee_id = '${ids.alpha}'`);
  sql(`update public.registrations set halftime_walk = true where attendee_id = '${ids.bravo}'`);
  sql(`update public.settings set value = '{"faq": true, "in_memoriam": true, "yearbook_ocr": true}' where key = 'feature_flags'`);
  sql(`update public.settings set value = to_jsonb('## Is there parking?' || chr(10) || 'Yes — free parking at every venue.' || chr(10) || chr(10) || '## Can I bring my spouse?' || chr(10) || 'Of course. Add guests when you RSVP.'::text) where key = 'faq_md'`);
  sql(`insert into public.memoriam (name, grad_school, years, note, sort) values
    ('Test Remembered Classmate', 'crown', '1959–2020', 'Always first on the dance floor.', 1),
    ('Test Second Classmate', 'jacobs', '1959–2015', null, 2)`);
});

test.afterAll(() => {
  sql(`update public.event_items e set price_cents = s.price_cents from json_populate_recordset(null::public.event_items, '${events.replace(/'/g, "''")}') s where e.id = s.id`);
  sql(`update public.settings t set value = coalesce(s.value, 'null'::jsonb) from json_populate_recordset(null::public.settings, '${settings.replace(/'/g, "''")}') s where t.key = s.key`);
  sql("delete from public.memoriam where name like 'Test %'");
  sql(`delete from public.email_log where to_email = '${ADMIN}'`);
  sql(`delete from public.admin_users where email = '${ADMIN}'`);
  clearDirectory();
});

for (const size of SIZES) {
  test.describe(size.name, () => {
    test.use({ viewport: size.viewport, deviceScaleFactor: size.deviceScaleFactor, contextOptions: { reducedMotion: "reduce" } });

    test("admin", async ({ page }) => {
      await page.goto("/admin/login");
      await shot(page, "admin-login", size.name);
      await signIn(page);
      const pages: Array<[string, string]> = [
        ["admin-dashboard", "/admin"],
        ["admin-rsvps", "/admin/rsvps"],
        ["admin-rsvp-detail", `/admin/rsvps/${ids.alpha}`],
        ["admin-rsvp-pending", `/admin/rsvps/${ids.pending}`],
        ["admin-events", "/admin/events"],
        ["admin-site-text", "/admin/content"],
        ["admin-event-edit", `/admin/events/${sql("select id from public.event_items where slug = 'sat-dinner'")}`],
        ["admin-photos", "/admin/photos"],
        ["admin-exports", "/admin/exports"],
        ["admin-yearbooks", "/admin/yearbooks?book=crown"],
        ["admin-stay-new", "/admin/stay/new"],
        ["admin-memoriam", "/admin/memoriam"],
        ["admin-settings", "/admin/settings"],
      ];
      for (const [name, path] of pages) {
        await page.goto(path);
        await shot(page, name, size.name);
      }
    });

    test("public optional pages", async ({ page, request }) => {
      await revalidate(request);
      await unlock(page, "/info");
      await shot(page, "info", size.name);
      await page.goto("/in-memoriam");
      await shot(page, "in-memoriam", size.name);
    });
  });
}
