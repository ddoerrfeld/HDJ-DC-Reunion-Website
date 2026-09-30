import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES, unlock } from "./helpers";

// WCAG 2.2 AA. SPEC §4.5: zero serious/critical violations to pass a phase.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

async function audit(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = results.violations.map((v) => `${v.impact}: ${v.id} (${v.nodes.length}) — ${v.help}`);
  if (summary.length) console.log(`${page.url()}\n  ${summary.join("\n  ")}`);
  return { blocking, all: results.violations };
}

for (const width of [375, 1440]) {
  test.describe(`axe at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, contextOptions: { reducedMotion: "reduce" } });

    test("gate page", async ({ page }) => {
      await page.goto("/unlock");
      const { all } = await audit(page);
      expect(all).toEqual([]);
    });

    test("gate page with an error", async ({ page }) => {
      await page.goto("/unlock?error=wrong");
      const { all } = await audit(page);
      expect(all).toEqual([]);
    });

    for (const route of [...PUBLIC_ROUTES, "/this-page-does-not-exist"]) {
      test(route, async ({ page }) => {
        await unlock(page);
        await page.goto(route);
        const { all } = await audit(page);
        expect(all).toEqual([]);
      });
    }

    test("mobile menu open", async ({ page }) => {
      test.skip(width > 1024, "menu button only exists below the lg breakpoint");
      await unlock(page);
      await page.getByRole("button", { name: "Menu" }).click();
      const { all } = await audit(page);
      expect(all).toEqual([]);
    });
  });
}
