import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { firstNamesCompatible, matchClassmate, nameKey, type ClassmateCandidate } from "../lib/classmates/match";
import { sql } from "./db";
import { unlock } from "./helpers";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
async function axeClean(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}
const pageParam = (page: Page) => Number(new URL(page.url()).searchParams.get("page"));
const visibleCount = (school: string) => Number(sql(`select count(*) from public.yearbook_pages where school = '${school}' and not hidden`));

test.describe("yearbook reader (SPEC §10.3)", () => {
  test("shelf shows both books and is accessible", async ({ page }) => {
    await unlock(page, "/yearbooks");
    await expect(page.getByRole("img", { name: "Cover of the Crown ’77 yearbook" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Cover of the Jacobs ’77 yearbook" })).toBeVisible();
    await axeClean(page);
  });

  test("deep link opens the right page; keys, thumbnails and zoom work", async ({ page }) => {
    await unlock(page, "/yearbooks/crown?page=2");
    await expect(page.getByRole("heading", { level: 1, name: /Crown ’77/ })).toBeVisible();
    // ?page=N lands on that page (highlighted in the thumbnail rail).
    await expect(page.getByRole("button", { name: "Page 2", exact: true })).toHaveAttribute("aria-current", "page");
    // Images are served through the signed CDN.
    const img = page.getByRole("img", { name: "Crown ’77, Page 2" });
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await axeClean(page);

    await page.keyboard.press("ArrowRight");
    await expect.poll(() => pageParam(page)).toBeGreaterThan(2);
    await page.keyboard.press("End");
    await expect.poll(() => pageParam(page)).toBe(visibleCount("crown"));
    await page.keyboard.press("Home");
    await expect.poll(() => pageParam(page)).toBe(1);

    // Thumbnail jump is instant (no turning through every page).
    await page.getByRole("button", { name: "Page 2", exact: true }).click();
    await expect.poll(() => pageParam(page), { timeout: 1_500 }).toBe(2);

    // Go to page.
    await page.getByRole("textbox", { name: "Go to page" }).first().fill("3");
    await page.getByRole("button", { name: "Go", exact: true }).first().click();
    await expect.poll(() => pageParam(page)).toBeGreaterThanOrEqual(2);

    // Zoom: Z opens, Esc closes; zoom buttons work.
    await page.keyboard.press("z");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Zoom in" })).toBeVisible();
    await dialog.getByRole("button", { name: "Zoom in" }).click();
    await axeClean(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("phone: single page, Next and the Pages sheet", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await unlock(page, "/yearbooks/jacobs?page=1");
    await expect(page.getByText(`1 of ${visibleCount("jacobs")}`, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect.poll(() => pageParam(page)).toBe(2);
    await page.getByRole("button", { name: "Pages" }).click();
    const sheet = page.getByRole("dialog", { name: "Jacobs ’77 pages" });
    await expect(sheet).toBeVisible();
    await axeClean(page);
    await sheet.getByRole("button", { name: "Front cover" }).click();
    await expect.poll(() => pageParam(page)).toBe(1);
    await context.close();
  });

  test("the image CDN refuses unsigned or forged URLs", async ({ request }) => {
    const path = sql("select display_url from public.yearbook_pages order by school, seq limit 1");
    expect((await request.get(`http://localhost:8787/${path}`)).status()).toBe(404);
    expect((await request.get(`http://localhost:8787/${path}?e=9999999999&s=forged`)).status()).toBe(404);
  });
});

test.describe("yearbook section gate: classmates only (owner decision)", () => {
  test("a name from the senior roster opens the yearbooks; others are asked to RSVP", async ({ page, context }) => {
    await unlock(page, "/");
    await context.addCookies([{ name: "c77_preview_section_gate", value: "1", domain: "localhost", path: "/" }]);
    await page.goto("/yearbooks/jacobs?page=2");
    await expect(page).toHaveURL(/\/yearbooks\?next=/);
    await expect(page.getByRole("heading", { name: "Confirm you’re a classmate" })).toBeVisible();
    await axeClean(page);

    await page.getByLabel("First name").fill("Nobody");
    await page.getByLabel("Last name in 1977").fill("Imaginary");
    await page.getByRole("button", { name: "Open the yearbooks" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "couldn’t find that name" })).toBeVisible();

    await page.getByLabel("First name").fill("Lynn");
    await page.getByLabel("Last name in 1977").fill("Bye");
    await page.getByRole("button", { name: "Open the yearbooks" }).click();
    await expect(page).toHaveURL(/\/yearbooks\/jacobs\?page=2/);
    await expect(page.getByRole("heading", { level: 1, name: /Jacobs ’77/ })).toBeVisible();
  });
});

test.describe("classmate matching", () => {
  const roster: ClassmateCandidate[] = [
    { id: "1", school: "crown", first_name: "Deborah", last_name: "O’Brien", last_key: nameKey("O’Brien"), yearbook_page_id: null },
    { id: "2", school: "crown", first_name: "Richard", last_name: "Disimoni", last_key: nameKey("Disimoni"), yearbook_page_id: null },
    { id: "3", school: "jacobs", first_name: "Chris", last_name: "Wojciechowski", last_key: nameKey("Wojciechowski"), yearbook_page_id: null },
  ];
  test("nicknames, punctuation, maiden names and one-letter OCR slips match", () => {
    expect(matchClassmate({ firstName: "Debbie", hsLastName: "OBrien" }, roster)?.id).toBe("1");
    expect(matchClassmate({ firstName: "Deb", hsLastName: "o'brien" }, roster)?.id).toBe("1");
    expect(matchClassmate({ firstName: "Rick", hsLastName: "Di Simoni" }, roster)?.id).toBe("2");
    expect(matchClassmate({ firstName: "Christopher", hsLastName: "Wojciechowsky" }, roster)?.id).toBe("3");
    expect(matchClassmate({ firstName: "Deborah", hsLastName: "Smith", currentLastName: "O’Brien" }, roster)?.id).toBe("1");
  });
  test("different first names or last names do not match", () => {
    expect(matchClassmate({ firstName: "Susan", hsLastName: "O’Brien" }, roster)).toBeNull();
    expect(matchClassmate({ firstName: "Richard", hsLastName: "Simon" }, roster)).toBeNull();
    expect(firstNamesCompatible("Bob", "Robert")).toBe(true);
    expect(firstNamesCompatible("Al", "Bob")).toBe(false);
  });
});
