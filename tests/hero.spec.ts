import { expect, test } from "@playwright/test";
import { unlock } from "./helpers";

const heroState = (page: import("@playwright/test").Page) =>
  page.evaluate(() => document.documentElement.dataset.hero);

test.describe("home hero animation (SPEC §4.1)", () => {
  test("plays on the first visit and is skippable by click", async ({ page }) => {
    await unlock(page);
    expect(await heroState(page)).toBe("play");
    await expect(page.getByRole("button", { name: "Skip intro" })).toBeVisible();
    await page.mouse.click(20, 400);
    expect(await heroState(page)).toBe("static");
    await expect(page.getByRole("button", { name: "Skip intro" })).toBeHidden();
    await expect(page.locator(".hero-content")).toHaveCSS("opacity", "1");
  });

  test("is skippable by keyboard via the Skip button, moving focus to RSVP", async ({ page }) => {
    await unlock(page);
    await page.getByRole("button", { name: "Skip intro" }).focus();
    await page.keyboard.press("Enter");
    expect(await heroState(page)).toBe("static");
    await expect(page.locator("#hero-rsvp")).toBeFocused();
  });

  test("is skippable by scrolling", async ({ page }) => {
    await unlock(page);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => heroState(page)).toBe("static");
  });

  test("finishes on its own in 8 s (owner-approved length; SPEC said 3.5 s)", async ({ page }) => {
    await unlock(page);
    expect(await heroState(page)).toBe("play");
    // The intro ends with the headline animation; the owner asked for an 8 s portrait build.
    const durations = await page.evaluate(() =>
      document.getAnimations().map((a) => Number(a.effect?.getComputedTiming().endTime ?? 0)),
    );
    expect(Math.max(...durations)).toBeLessThanOrEqual(8000);
    await expect.poll(() => heroState(page), { timeout: 11_000 }).toBe("static");
    await expect(page.locator(".hero-content")).toHaveCSS("opacity", "1");
  });

  test("plays only once per session", async ({ page }) => {
    await unlock(page);
    await page.mouse.click(20, 400);
    await page.reload();
    expect(await heroState(page)).toBe("static");
    await expect(page.getByRole("button", { name: "Skip intro" })).toBeHidden();
  });

  test("shows the final state immediately under prefers-reduced-motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await unlock(page);
    expect(await heroState(page)).toBe("static");
    await expect(page.locator(".hero-content")).toHaveCSS("opacity", "1");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Three years together. One year apart. Fifty years later.",
    );
    await context.close();
  });
});
