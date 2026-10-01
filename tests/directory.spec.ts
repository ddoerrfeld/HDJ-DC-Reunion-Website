import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { clearDirectory, DIRECTORY_PEOPLE, privateMarker, seedDirectory } from "./db";
import { unlock } from "./helpers";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
async function axeClean(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}
const card = (page: Page, name: string | RegExp) => page.getByRole("article").filter({ has: page.getByRole("heading", { name }) });
const ALPHA = "Testa “Tess” (Abernathy) Zimmerly";

test.describe.configure({ mode: "serial" });

test.describe("Who’s Coming directory (SPEC §9)", () => {
  test.beforeAll(async () => {
    await seedDirectory();
  });
  test.afterAll(() => clearDirectory());

  test("lists opted-in classmates only, with the standard display name, and is accessible", async ({ page }) => {
    await unlock(page, "/whos-coming");
    await expect(page.getByRole("heading", { name: ALPHA })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bartholomew Brávo" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Carlotta “Lottie” Charleston" })).toBeVisible();
    // Opted out, and pending the organizer's approval: not listed, only counted.
    await expect(page.getByRole("heading", { name: /Optedout|Unverified/ })).toHaveCount(0);
    await expect(page.getByText(/more classmates? coming who aren’t listed/)).toBeVisible();
    await expect(card(page, ALPHA).getByText("Crown ’77")).toBeVisible();
    await expect(card(page, /Charleston/).getByText("Attended both")).toBeVisible();
    await expect(card(page, /Brávo/).getByText("Reunion Dinner")).toBeVisible();
    await axeClean(page);
  });

  test("no private field ever reaches the browser", async ({ page, request }) => {
    await unlock(page, "/whos-coming");
    const html = await (await page.request.get("/whos-coming")).text();
    for (const p of DIRECTORY_PEOPLE) {
      const m = privateMarker(p.key);
      for (const value of [m.email, m.phone, m.city]) expect(html, `${p.key} ${value}`).not.toContain(value);
    }
    expect(html).not.toContain("Optedout");
    expect(html).not.toContain("Unverified");
    expect(html).not.toMatch(/halftime_walk|edit_token|classmate_status/);

    // The anon key can call the directory function — which returns only public columns — and cannot read attendees.
    const anon = { apikey: process.env.SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}` };
    const rpc = await request.post(`${process.env.SUPABASE_URL}/rest/v1/rpc/directory_entries`, { headers: anon, data: {} });
    expect(rpc.ok()).toBe(true);
    const rows = (await rpc.json()) as Array<Record<string, unknown>>;
    expect(Object.keys(rows[0]).sort()).toEqual(
      [
        "activities", "current_last_name", "first_name", "grad_school", "hs_last_name", "id", "nickname", "photo_path",
        "recent_rank", "then_photo_path", "yearbook_crop", "yearbook_page_number", "yearbook_school",
      ].sort(),
    );
    expect(JSON.stringify(rows)).not.toMatch(/dir-test-.*@example\.com|Privateville/);
    const table = await request.get(`${process.env.SUPABASE_URL}/rest/v1/attendees?select=email`, { headers: anon });
    expect(table.ok()).toBe(false);
  });

  test("search finds people by high-school last name, current last name and nickname (accent-insensitive)", async ({ page }) => {
    await unlock(page, "/whos-coming");
    const search = page.getByRole("searchbox", { name: /Search by name/ });
    for (const term of ["abern", "Zimmerly", "tess", "bravo", "lottie charl"]) {
      await search.fill(term);
      await expect(page.getByText(/^Showing \d+ of \d+$/)).toBeVisible();
      await expect(page.getByRole("article").first()).toBeVisible();
    }
    await search.fill("bravo");
    await expect(page.getByRole("heading", { name: "Bartholomew Brávo" })).toBeVisible();
    await expect(page.getByRole("heading", { name: ALPHA })).toHaveCount(0);
    await search.fill("nobody-by-this-name");
    await expect(page.getByText("No one matches yet — share the site with classmates!")).toBeVisible();
  });

  test("filters combine, live in the URL, survive a reload, and clear", async ({ page }) => {
    await unlock(page, "/whos-coming");
    const filters = page.getByRole("button", { name: /^Filters/ });
    if (await filters.isVisible()) await filters.click();
    await page.getByRole("button", { name: /^Reunion Dinner/ }).click();
    await expect(page.getByRole("heading", { name: ALPHA })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Charleston/ })).toHaveCount(0);
    await page.getByRole("button", { name: /^Golf/ }).click();
    // Any (default): dinner OR golf. All: dinner AND golf.
    await page.getByRole("button", { name: "all of these" }).click();
    await expect(page.getByRole("heading", { name: ALPHA })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Brávo/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Has a ’77 photo" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("then")).toBe("1");
    expect(new URL(page.url()).searchParams.get("match")).toBe("all");

    await page.reload();
    await expect(page.getByRole("button", { name: "Has a ’77 photo" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { name: ALPHA })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Brávo/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Clear all filters" }).click();
    await expect(page.getByRole("heading", { name: /Brávo/ })).toBeVisible();
    await expect.poll(() => new URL(page.url()).search).toBe("");

    // School from the summary bar, day filter.
    await page.goto("/whos-coming?school=other&days=sat");
    await expect(page.getByRole("heading", { name: /Charleston/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: ALPHA })).toHaveCount(0);
  });

  test("Then & Now flips by keyboard, and See me in ’77 opens the reader with the portrait outlined", async ({ page }) => {
    await unlock(page, "/whos-coming?q=tess");
    const alpha = card(page, ALPHA);
    const flip = alpha.getByRole("button", { name: /Show the ’77 photo/ });
    await flip.focus();
    await page.keyboard.press("Enter");
    await expect(alpha.getByRole("button", { name: /Show today’s photo/ })).toHaveAttribute("aria-pressed", "true");
    await expect(alpha.getByRole("img", { name: `${ALPHA} in 1977` })).toBeVisible();
    await axeClean(page);

    const link = alpha.getByRole("link", { name: "See Testa in ’77" });
    await expect(link).toHaveAttribute("href", /\/yearbooks\/crown\?page=\d+&hl=0\.1000,0\.2000,0\.2000,0\.2500/);
    await link.click();
    await expect(page.getByRole("heading", { level: 1, name: /Crown ’77/ })).toBeVisible();
    await expect(page.locator(".yb-highlight")).toBeVisible();
  });

  test("sort by current last name and most recent", async ({ page }) => {
    await unlock(page, "/whos-coming?sort=current&q=a");
    await expect(page.getByRole("combobox", { name: "Sort by" })).toHaveValue("current");
    await page.goto("/whos-coming?sort=recent");
    await expect(page.getByRole("combobox", { name: "Sort by" })).toHaveValue("recent");
    await expect(page.getByRole("article").first()).toBeVisible();
  });

  test("at launch the directory is for confirmed classmates only", async ({ page, context }) => {
    await unlock(page, "/");
    await context.addCookies([{ name: "c77_preview_section_gate", value: "1", domain: "localhost", path: "/" }]);
    await page.goto("/whos-coming");
    await expect(page.getByRole("heading", { name: "Confirm you’re a classmate" })).toBeVisible();
    await expect(page.getByRole("heading", { name: ALPHA })).toHaveCount(0);
    await page.getByLabel("First name").fill("Lynn");
    await page.getByLabel("Last name in 1977").fill("Bye");
    await page.getByRole("button", { name: "See who’s coming" }).click();
    await expect(page).toHaveURL(/\/whos-coming$/);
    await expect(page.getByRole("heading", { name: ALPHA })).toBeVisible();
  });
});
