import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { revalidate, setLodging } from "./db";
import { unlock } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("/stay with 0, 1 official, and 3 mixed lodging rows (SPEC §15 Phase 2)", () => {
  test.afterAll(async ({ request }) => {
    setLodging([]);
    await revalidate(request);
  });

  test("0 rows: designed empty state, no home callout", async ({ page, request }) => {
    setLodging([]);
    await revalidate(request);
    await unlock(page, "/stay");
    await expect(page.getByRole("heading", { name: "A hotel room block is being arranged" })).toBeVisible();
    await expect(page.getByText("Check back soon.")).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Test Hotel — Official Block" })).toHaveCount(0);
  });

  test("1 official block: featured card with code, countdown, booking and home callout", async ({ page, request, context }) => {
    setLodging(["official"]);
    await revalidate(request);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await unlock(page, "/stay");

    const card = page.getByRole("article", { name: "Test Hotel — Official Block" });
    await expect(card.getByText("Official reunion room block")).toBeVisible();
    await expect(card.getByText("$129/night + tax")).toBeVisible();
    await expect(card.getByText(/Rate held until .+ — 23 days left/)).toBeVisible();
    await expect(card.getByText("CLASS77")).toBeVisible();
    await expect(card.getByText("Breakfast included.")).toBeVisible();

    const book = card.getByRole("link", { name: /Book your room/ });
    await expect(book).toHaveAttribute("href", "https://example.com/book");
    await expect(book).toHaveAttribute("target", "_blank");
    await expect(card.getByRole("link", { name: /^Call/ })).toHaveAttribute("href", "tel:8475550100");

    await card.getByRole("button", { name: "Copy code" }).click();
    await expect(card.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("CLASS77");

    await expect(page.getByRole("heading", { name: "Other places nearby" })).toHaveCount(0);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Test Hotel — Official Block" })).toBeVisible();
  });

  test("3 mixed rows: featured block plus smaller nearby cards, closed block labelled", async ({ page, request }) => {
    setLodging(["official", "nearbyOpen", "nearbyClosed"]);
    await revalidate(request);
    await unlock(page, "/stay");

    await expect(page.getByRole("article", { name: "Test Hotel — Official Block" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Other places nearby" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Test Inn Nearby" })).toBeVisible();
    const closed = page.getByRole("article", { name: "Test Suites" });
    await expect(closed.getByText("Block closed — call the hotel")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("hidden rows are not shown", async ({ page, request }) => {
    setLodging(["nearbyOpen"]);
    (await import("./db")).sql("update public.lodging set visible = false where name = 'Test Inn Nearby'");
    await revalidate(request);
    await unlock(page, "/stay");
    await expect(page.getByRole("heading", { name: "A hotel room block is being arranged" })).toBeVisible();
  });
});
