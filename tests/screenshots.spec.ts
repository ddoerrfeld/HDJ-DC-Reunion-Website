/**
 * Review-gate screenshots (SPEC §4.7): full-page captures at 375, 768 and
 * 1440 px, plus 200 % browser zoom (a 1440 × 900 window at 200 % zoom is a
 * 720 × 450 CSS-px viewport at device scale factor 2). Run: npm run screenshots
 */
import { test } from "@playwright/test";
import { confirmationEmail, editLinkEmail } from "../lib/email/templates";
import { revalidate, setLodging, sql } from "./db";
import { unlock } from "./helpers";

const OUT = `screenshots/${process.env.SHOT_DIR ?? "phase-3"}`;
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

    test("rsvp steps", async ({ page }) => {
      await unlock(page, "/rsvp");
      const person = {
        firstName: "Susan", hsLastName: "Miller", nameChanged: true, currentLastName: "Johnson", nickname: "Sue",
        email: "susan@example.com", phone: "", city: "Algonquin", state: "IL", gradSchool: "jacobs",
      };
      const selections = {
        "fri-tour-jacobs": { selected: true, guests: 0, halftime: false, guestNames: [] },
        "fri-game-jacobs": { selected: true, guests: 1, halftime: true, guestNames: [] },
        "sat-dinner": { selected: true, guests: 1, halftime: false, guestNames: [{ first: "Tom", last: "Johnson" }] },
      };
      const names = ["about", "photo", "weekend", "guests", "review"];
      for (let step = 0; step < names.length; step++) {
        await page.evaluate(
          ([st, p, sel]) => sessionStorage.setItem("c77-rsvp-draft", JSON.stringify({ step: st, state: { person: p, photo: null, selections: sel, showInDirectory: true } })),
          [step, person, selections] as const,
        );
        await page.reload();
        await page.getByRole("heading", { level: 2 }).first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: `${OUT}/rsvp-${step + 1}-${names[step]}-${size.name}.png`, fullPage: true });
      }
      // Validation state on step 1.
      await page.evaluate(() => sessionStorage.removeItem("c77-rsvp-draft"));
      await page.reload();
      await page.getByRole("button", { name: "Next" }).click();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${OUT}/rsvp-1-about-errors-${size.name}.png`, fullPage: true });
      // Crop view with a real iPhone photo.
      await page.getByLabel("First name").fill("Susan");
      await page.getByLabel("Your last name in high school (maiden name, if it’s changed)").fill("Miller");
      await page.getByLabel("Email address").fill("susan@example.com");
      await page.getByText("Jacobs ’77", { exact: true }).click();
      await page.getByRole("button", { name: "Next" }).click();
      await page.locator('input[type="file"]').setInputFiles("tests/fixtures/iphone-gps.heic");
      await page.getByText("Drag to position your face in the square.").waitFor({ timeout: 30_000 });
      await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${OUT}/rsvp-2-photo-crop-${size.name}.png`, fullPage: true });
      await page.evaluate(() => sessionStorage.removeItem("c77-rsvp-draft"));
    });

    test("rsvp outcome pages", async ({ page }) => {
      const email = `shot-${size.name}@example.com`;
      sql(`delete from public.attendees where email = '${email}'`);
      await unlock(page, "/rsvp/lost");
      await page.screenshot({ path: `${OUT}/rsvp-lost-link-${size.name}.png`, fullPage: true });
      await page.goto("/rsvp/check-email?reason=duplicate");
      await page.screenshot({ path: `${OUT}/rsvp-check-email-${size.name}.png`, fullPage: true });
      await page.goto("/rsvp/edit/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
      await page.screenshot({ path: `${OUT}/rsvp-edit-invalid-${size.name}.png`, fullPage: true });
      // A real submission through the UI for the confirmation page.
      await page.goto("/rsvp");
      await page.evaluate((mail) => sessionStorage.setItem("c77-rsvp-draft", JSON.stringify({ step: 4, state: {
        person: { firstName: "Susan", hsLastName: "Miller", nameChanged: true, currentLastName: "Johnson", nickname: "", email: mail, phone: "", city: "", state: "", gradSchool: "jacobs" },
        photo: null,
        selections: { "fri-tour-jacobs": { selected: true, guests: 0, halftime: false, guestNames: [] }, "sat-dinner": { selected: true, guests: 1, halftime: false, guestNames: [{ first: "Tom", last: "Johnson" }] } },
        showInDirectory: true } })), email);
      await page.reload();
      await page.getByRole("button", { name: "Submit RSVP" }).click();
      await page.waitForURL(/\/rsvp\/confirmed/);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${OUT}/rsvp-confirmed-${size.name}.png`, fullPage: true });
      const link = sql(`select body_text from public.email_log where to_email = '${email}' order by created_at desc limit 1`).match(/\/rsvp\/edit\/[A-Za-z0-9_-]{43}/)![0];
      await page.goto(link);
      await page.getByRole("heading", { level: 1, name: "Change your RSVP" }).waitFor();
      await page.screenshot({ path: `${OUT}/rsvp-edit-${size.name}.png`, fullPage: true });
      sql(`delete from public.attendees where email = '${email}'`);
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

// The confirmation and edit-link emails, rendered as a mail client would at desktop and phone widths.
test("email previews", async ({ page }) => {
  const confirm = confirmationEmail({
    firstName: "Susan",
    editUrl: "https://crownjacobs77.com/rsvp/edit/EXAMPLE-PRIVATE-LINK",
    lines: [
      { title: "School Tour — Jacobs", when: "Friday, October 8 · 3:30–4:30 PM", where: "Harry D. Jacobs High School", guests: 0, status: "Confirmed" },
      { title: "Football: Jacobs vs. Prairie Ridge", when: "Friday, October 8 · 7:00 PM", where: "Jacobs High School", guests: 1, status: "Confirmed" },
      { title: "Reunion Dinner", when: "Saturday, October 9 · 6:30–10:30 PM", where: "West Dundee VFW Post 2298", guests: 1, status: "Confirmed", paid: true },
    ],
  });
  const lost = editLinkEmail({ firstName: "Susan", editUrl: "https://crownjacobs77.com/rsvp/edit/EXAMPLE", reason: "lost" });
  for (const [name, html] of [["email-confirmation", confirm.html], ["email-edit-link", lost.html]] as const) {
    for (const width of [700, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(html);
      await page.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: true });
    }
  }
});
