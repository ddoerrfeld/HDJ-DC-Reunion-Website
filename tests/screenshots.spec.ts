/**
 * Review-gate screenshots (SPEC §4.7): full-page captures at 375, 768 and
 * 1440 px, plus 200 % browser zoom (a 1440 × 900 window at 200 % zoom is a
 * 720 × 450 CSS-px viewport at device scale factor 2). Run: npm run screenshots
 */
import { test } from "@playwright/test";
import { revalidate, setLodging } from "./db";
import { unlock } from "./helpers";

const OUT = `screenshots/${process.env.SHOT_DIR ?? "phase-2"}`;
const SIZES = [
  { name: "375", viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 },
  { name: "768", viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1 },
  { name: "1440", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: "1440-zoom200", viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 },
];
const PAGES = [
  { slug: "home", path: "/" },
  { slug: "weekend", path: "/weekend" },
  { slug: "styleguide", path: "/styleguide" },
  { slug: "404", path: "/this-page-does-not-exist" },
];

// /stay in each acceptance state (SPEC §15 Phase 2), using clearly fictional test rows.
const STAY_STATES = [
  { slug: "stay-0-rows", rows: [] },
  { slug: "stay-1-official", rows: ["official"] },
  { slug: "stay-3-mixed", rows: ["official", "nearbyOpen", "nearbyClosed"] },
] as const;

test.describe.configure({ mode: "serial" });

for (const size of SIZES) {
  test.describe(size.name, () => {
    test.use({ viewport: size.viewport, deviceScaleFactor: size.deviceScaleFactor, contextOptions: { reducedMotion: "reduce" } });

    test("gate", async ({ page }) => {
      await page.goto("/unlock");
      await page.screenshot({ path: `${OUT}/gate-${size.name}.png`, fullPage: true });
      await page.goto("/unlock?error=wrong");
      await page.screenshot({ path: `${OUT}/gate-error-${size.name}.png`, fullPage: true });
    });

    for (const target of PAGES) {
      test(target.slug, async ({ page }) => {
        await unlock(page);
        await page.goto(target.path);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: `${OUT}/${target.slug}-${size.name}.png`, fullPage: true });
      });
    }

    test("stay states", async ({ page, request }) => {
      await unlock(page);
      for (const state of STAY_STATES) {
        setLodging([...state.rows]);
        await revalidate(request);
        await page.goto("/stay");
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: `${OUT}/${state.slug}-${size.name}.png`, fullPage: true });
      }
      setLodging([]);
      await revalidate(request);
    });

    test("mobile menu", async ({ page }) => {
      test.skip(size.viewport.width >= 1024, "desktop shows the full nav");
      await unlock(page);
      await page.getByRole("button", { name: "Menu" }).click();
      await page.screenshot({ path: `${OUT}/menu-open-${size.name}.png` });
    });
  });
}

// Hero animation keyframes for review (motion on).
for (const size of [SIZES[0], SIZES[2]]) {
  test(`hero frames ${size.name}`, async ({ page }) => {
    await page.setViewportSize(size.viewport);
    await unlock(page);
    // Pause the CSS timeline and scrub it deterministically.
    // A locator screenshot scrolls, which (correctly) skips the intro; spend that first.
    await page.locator(".hero").screenshot();
    await page.evaluate(() => (document.documentElement.dataset.hero = "play"));
    await page.waitForFunction(() => document.getAnimations().length > 5);
    for (const t of [300, 1000, 1300, 1500, 2000, 2500, 3000, 3400]) {
      await page.evaluate((ms) => {
        document.documentElement.dataset.hero = "play";
        for (const a of document.getAnimations()) {
          a.pause();
          a.currentTime = ms;
        }
      }, t);
      await page.locator(".hero").screenshot({ path: `${OUT}/hero-${size.name}-t${String(t).padStart(4, "0")}ms.png` });
    }
  });
}
