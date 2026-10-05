import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { sql } from "./db";
import { unlock } from "./helpers";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
async function axeClean(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

const ADMIN = "adm-test-organizer@example.com";
const card = (page: Page, title: string) => page.locator("article").filter({ has: page.getByRole("heading", { name: title, exact: true }) });

/** Fictional RSVPs: one going to the dinner with a guest, one walking at the Jacobs game. */
function seedRsvps(): Record<string, string> {
  const people = [
    { key: "dinner", first: "Adele", hs: "Admintest", school: "jacobs", sel: [{ slug: "sat-dinner", guests: 1, halftime: false, guestNames: [{ first: "Guy", last: "Guestly" }] }] },
    { key: "walker", first: "Walter", hs: "Halftimer", school: "jacobs", sel: [{ slug: "fri-game-jacobs", guests: 0, halftime: true, guestNames: [] }] },
  ];
  const ids: Record<string, string> = {};
  for (const p of people) {
    const payload = {
      person: { firstName: p.first, hsLastName: p.hs, currentLastName: "", nickname: "", email: `adm-test-${p.key}@example.com`, phone: "555-0199", city: "Testville", state: "IL", gradSchool: p.school },
      showInDirectory: true,
      selections: p.sel,
    };
    ids[p.key] = sql(`select (public.rsvp_create('${JSON.stringify(payload).replace(/'/g, "''")}'::jsonb, 'adm-test-${p.key}')) ->> 'attendeeId'`);
    sql(`update public.attendees set classmate_status = 'approved' where id = '${ids[p.key]}'`);
  }
  return ids;
}

async function signIn(page: Page) {
  sql("delete from public.admin_login_tokens");
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(ADMIN);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();
  const body = sql(`select body_text from public.email_log where to_email = '${ADMIN}' and template = 'admin-login' order by created_at desc limit 1`);
  const link = /https?:\/\/\S+\/admin\/login\/verify\?token=[A-Za-z0-9_-]+/.exec(body)?.[0];
  expect(link).toBeTruthy();
  const url = new URL(link!);
  return `${url.pathname}${url.search}`;
}

test.describe.configure({ mode: "serial" });

test.describe("Organizer admin (SPEC §11)", () => {
  let events = "";
  let settings = "";
  let ids: Record<string, string> = {};

  test.beforeAll(() => {
    // Snapshot what the tests change, and restore it afterwards.
    events = sql("select json_agg(e) from public.event_items e");
    settings = sql("select json_agg(s) from public.settings s");
    sql("delete from public.attendees where email::text like 'adm-test-%'");
    sql(`insert into public.admin_users (email) values ('${ADMIN}') on conflict do nothing`);
    ids = seedRsvps();
  });

  test.afterAll(() => {
    sql(`update public.event_items e set price_cents = s.price_cents, requires_payment = s.requires_payment, capacity = s.capacity
      from json_populate_recordset(null::public.event_items, '${events.replace(/'/g, "''")}') s where e.id = s.id`);
    sql(`update public.settings t set value = coalesce(s.value, 'null'::jsonb) from json_populate_recordset(null::public.settings, '${settings.replace(/'/g, "''")}') s where t.key = s.key`);
    sql("delete from public.memoriam where name like 'Test %'");
    sql("delete from public.settings where key = 'site_text'");
    sql("delete from public.classmates where last_name in ('Hxlfxxmer', 'Halftimer', 'Addedperson')");
    sql("delete from public.email_log where to_email::text like 'adm-test-%'");
    sql("delete from public.attendees where email::text like 'adm-test-%'");
    sql(`delete from public.admin_users where email = '${ADMIN}'`);
    sql("delete from public.admin_login_tokens");
  });

  test("admin pages, actions and exports are closed without a session", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto("/admin/rsvps");
    await expect(page).toHaveURL(/\/admin\/login$/);
    const csv = await page.request.get("/admin/exports/attendees.csv", { maxRedirects: 0 });
    expect(csv.status()).toBe(303);

    // A stranger gets the same answer as an organizer, but no email.
    await page.goto("/admin/login");
    await page.getByLabel("Email address").fill("adm-test-stranger@example.com");
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(page.getByText("Check your email")).toBeVisible();
    expect(sql("select count(*) from public.email_log where to_email = 'adm-test-stranger@example.com'")).toBe("0");
    await axeClean(page);
  });

  test("magic link: opening it doesn't sign in; the button does, once", async ({ page }) => {
    const link = await signIn(page);
    // A mail scanner opening the link must not use it up.
    await page.goto(link);
    await page.goto(link);
    await expect(page.getByRole("heading", { name: "Sign in to the organizer pages" })).toBeVisible();
    await axeClean(page);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(page.getByText(`Signed in as ${ADMIN}`)).toBeVisible();

    // The same link can't be used again.
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login\?signedout=1/);
    await page.goto(link);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/expired or was already used/)).toBeVisible();
  });

  test.describe("signed in", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(await signIn(page));
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    });

    test("every admin page is accessible", async ({ page }) => {
      for (const path of ["/admin", "/admin/rsvps", "/admin/events", "/admin/photos", "/admin/exports", "/admin/yearbooks", "/admin/stay", "/admin/memoriam", "/admin/settings", `/admin/rsvps/${ids.dinner}`, "/admin/events/new", "/admin/stay/new", "/admin/memoriam/new"]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await axeClean(page);
      }
    });

    test("acceptance: change the dinner price, turn on golf payment — the Weekend page follows", async ({ page, context }) => {
      await page.goto("/admin/events");
      await page.getByRole("link", { name: "Reunion Dinner" }).click();
      await page.getByLabel("Price per person ($)").fill("95");
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByRole("status")).toContainText("Saved");

      await page.goto("/admin/events");
      await page.getByRole("link", { name: /^Golf/ }).click();
      await page.getByLabel("Requires payment").check();
      await page.getByLabel("Price per person ($)").fill("62.50");
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByRole("status")).toContainText("Saved");

      const site = await context.newPage();
      await unlock(site, "/weekend");
      await expect(card(site, "Reunion Dinner").getByText("$95 per person")).toBeVisible();
      await expect(card(site, "Golf").getByText("$62.50 per person")).toBeVisible();
    });

    test("acceptance: halftime counts, mark paid, and the check-in roster export", async ({ page }) => {
      await page.goto("/admin");
      const halftime = page.locator("section", { has: page.getByRole("heading", { name: "Halftime walkers" }) });
      await expect(halftime.getByText(/of \d+ going/).first()).toBeVisible();
      expect(Number(sql("select count(*) from public.registrations r join public.event_items e on e.id = r.event_item_id where e.slug = 'fri-game-jacobs' and r.halftime_walk"))).toBeGreaterThan(0);

      // Mark the dinner as paid.
      await page.goto(`/admin/rsvps/${ids.dinner}`);
      await expect(page.getByText("Not paid yet")).toBeVisible();
      await page.getByRole("button", { name: "Mark as paid" }).click();
      await expect(page.getByText("Marked paid")).toBeVisible();
      expect(sql(`select count(*) from public.registrations where attendee_id = '${ids.dinner}' and paid_at is not null`)).toBe("1");

      // Roster: classmate then their guest, sorted by high-school last name; payment column filled.
      const roster = await (await page.request.get("/admin/exports/roster-sat-dinner.csv")).text();
      expect(roster.charCodeAt(0)).toBe(0xfeff);
      const lines = roster.trim().split("\r\n");
      expect(lines[0]).toContain("Name tag");
      const i = lines.findIndex((l) => l.startsWith("Admintest,Adele"));
      expect(i).toBeGreaterThan(0);
      expect(lines[i]).toContain("Paid");
      expect(lines[i + 1]).toMatch(/^Guestly,Guy,Guy Guestly,Guest,Adele Admintest/);

      const walkers = await (await page.request.get("/admin/exports/halftime.csv")).text();
      expect(walkers).toContain("Halftimer,Walter");
      const everyone = await (await page.request.get("/admin/exports/attendees.csv")).text();
      expect(everyone).toContain("adm-test-dinner@example.com");
    });

    test("RSVP search, edit, approve and resend link", async ({ page }) => {
      sql(`update public.attendees set classmate_status = 'pending' where id = '${ids.walker}'`);
      await page.goto("/admin");
      await expect(page.getByRole("link", { name: "Walter Halftimer" })).toBeVisible();
      await page.goto("/admin/rsvps?q=halftim");
      await expect(page.getByText(/^1 of \d+ RSVPs/)).toBeVisible();
      await page.getByRole("link", { name: "Walter Halftimer" }).click();
      await page.getByRole("button", { name: "Yes, this is a classmate" }).click();
      await expect(page.getByRole("status")).toContainText("Approved");
      expect(sql(`select classmate_status from public.attendees where id = '${ids.walker}'`)).toBe("approved");

      await page.getByLabel("Nickname").fill("Wally");
      await page.getByRole("button", { name: "Save details" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Walter “Wally” Halftimer" })).toBeVisible();

      await page.getByRole("button", { name: "Email them a new link" }).click();
      await expect(page.getByRole("status")).toContainText("Email sent");
      expect(sql("select body_text from public.email_log where to_email = 'adm-test-walker@example.com' and template = 'edit-link' order by created_at desc limit 1")).toContain("organizer sent you a fresh link");
    });

    test("site text: the organizer rewrites headings and paragraphs; blank restores the original", async ({ page, context }) => {
      await page.goto("/admin/content");
      await axeClean(page);
      await page.getByLabel("Headline", { exact: true }).fill("Fifty years. One weekend. Come home.");
      await page.getByRole("textbox", { name: "Introduction" }).first().fill("Every event is optional.\n\n**Parking is free** at every venue.");
      await page.getByLabel(/Label on events at the same time/).fill("Pick one");
      await page.getByRole("button", { name: "Save site text" }).click();
      await expect(page.getByRole("status")).toContainText("Saved");
      await expect(page.getByText("Original: Three years together. One year apart. Fifty years later.")).toBeVisible();
      expect(sql("select value::text from public.settings where key = 'site_text'")).not.toContain("weekend.coming_soon");

      const site = await context.newPage();
      await unlock(site, "/");
      await expect(site.getByRole("heading", { level: 1, name: "Fifty years. One weekend. Come home." })).toBeVisible();
      await site.goto("/weekend");
      await expect(site.locator("strong", { hasText: "Parking is free" })).toBeVisible();
      await expect(site.getByText("Pick one", { exact: true }).first()).toBeVisible();

      await page.getByLabel("Headline", { exact: true }).fill("");
      await page.getByRole("button", { name: "Save site text" }).click();
      await expect(page.getByRole("status")).toContainText("Saved");
      await site.goto("/");
      await expect(site.getByRole("heading", { level: 1, name: "Three years together. One year apart. Fifty years later." })).toBeVisible();
    });

    test("classmate list: correcting a misread name confirms the waiting RSVP", async ({ page }) => {
      sql(`update public.attendees set classmate_status = 'pending' where id = '${ids.walker}'`);
      sql("insert into public.classmates (school, first_name, last_name) values ('jacobs', 'Walter', 'Hxlfxxmer') on conflict do nothing");
      await page.goto(`/admin/rsvps/${ids.walker}`);
      await expect(page.getByRole("link", { name: "Walter Hxlfxxmer" })).toBeVisible();
      await page.getByRole("link", { name: "Walter Hxlfxxmer" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Classmates" })).toBeVisible();
      await axeClean(page);
      await page.getByLabel("Last name for Walter Hxlfxxmer").fill("Halftimer");
      await page.getByRole("button", { name: "Save Walter Hxlfxxmer" }).click();
      await expect(page.getByRole("status")).toContainText("1 waiting RSVP now matches and was confirmed");
      expect(sql(`select classmate_status from public.attendees where id = '${ids.walker}'`)).toBe("matched");
      expect(sql("select count(*) from public.email_log where to_email = 'adm-test-walker@example.com' and template = 'classmate-approved'")).not.toBe("0");

      await page.getByLabel("First name", { exact: true }).fill("Addie");
      await page.getByLabel("Last name in 1977").fill("Addedperson");
      await page.getByRole("button", { name: "Add", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("Added Addie Addedperson");
    });

    test("settings turn on the Info and In Memoriam pages", async ({ page, context }) => {
      await page.goto("/admin/settings");
      await page.getByLabel(/Info page/).check();
      await page.getByRole("textbox", { name: "Questions & answers" }).fill("## Is there parking?\nYes — free parking at every venue.");
      await page.getByLabel(/In Memoriam page/).check();
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(page.getByRole("status")).toContainText("Saved");

      await page.goto("/admin/memoriam/new");
      await page.getByLabel("Name", { exact: true }).fill("Test Remembered Classmate");
      await page.getByLabel("Years").fill("1959–2020");
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.getByRole("link", { name: "Test Remembered Classmate" })).toBeVisible();

      const site = await context.newPage();
      await unlock(site, "/info");
      await expect(site.getByRole("heading", { name: "Is there parking?" })).toBeVisible();
      await expect(site.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Info" })).toBeVisible();
      await axeClean(site);
      await site.goto("/in-memoriam");
      await expect(site.getByRole("heading", { name: "Test Remembered Classmate" })).toBeVisible();
      await axeClean(site);
    });
  });
});
