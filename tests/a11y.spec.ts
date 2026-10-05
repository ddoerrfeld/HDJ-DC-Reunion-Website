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

const ROUTES = [...PUBLIC_ROUTES, "/rsvp/lost", "/yearbooks/jacobs", "/yearbooks/crown", "/this-page-does-not-exist"];

// SPEC §4.5: nothing may need sideways scrolling at 375 px or at 200 % zoom.
async function noSidewaysScroll(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "page scrolls sideways").toBeLessThanOrEqual(1);
}

// 200 % browser zoom on a 1440 × 900 window = a 720 × 450 CSS-pixel viewport at 2× density.
const VIEWPORTS = [
  { label: "375px", viewport: { width: 375, height: 900 }, deviceScaleFactor: 1 },
  { label: "1440px", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { label: "200% zoom", viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 },
];

for (const { label, viewport, deviceScaleFactor } of VIEWPORTS) {
  const width = viewport.width;
  test.describe(`axe at ${label}`, () => {
    test.use({ viewport, deviceScaleFactor, contextOptions: { reducedMotion: "reduce" } });

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

    for (const route of ROUTES) {
      test(route, async ({ page }) => {
        await unlock(page);
        await page.goto(route);
        const { all } = await audit(page);
        expect(all).toEqual([]);
        if (!route.startsWith("/yearbooks/") && route !== "/styleguide") await noSidewaysScroll(page);
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
