import { expect, test } from "@playwright/test";
import { revalidate, sql } from "./db";
import { unlock } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("/weekend renders from the database (SPEC §15 Phase 2)", () => {
  test.beforeEach(async ({ page }) => {
    await unlock(page, "/weekend");
  });

  test("shows every seeded item in three day sections", async ({ page }) => {
    for (const day of ["Friday", "Saturday", "Sunday"]) {
      await expect(page.getByRole("heading", { level: 2, name: new RegExp(`^${day}`) })).toBeVisible();
    }
    for (const title of [
      "School Tour — Jacobs",
      "School Tour — Crown",
      "Pre-Game Drink",
      "Football: Jacobs vs. Prairie Ridge",
      "Football: Dundee-Crown vs. Crystal Lake South",
      "Golf",
      "Pickleball & Social",
      "Reunion Dinner",
    ]) {
      await expect(page.getByRole("heading", { level: 3, name: title, exact: true })).toBeVisible();
    }
    await expect(page.getByText("Schedule to be confirmed by the schools")).toHaveCount(2);
    await expect(page.getByText("Venue to be confirmed")).toBeVisible();
    await expect(page.getByText("Paid event · price coming soon")).toBeVisible();
    await expect(page.getByRole("group", { name: /Choose one/ })).toHaveCount(3);
  });

  test("renders TBD brunch as the designed placeholder", async ({ page }) => {
    const brunch = page.locator("#sun-brunch");
    await expect(brunch.getByText("Time & place coming soon")).toBeVisible();
    await expect(brunch.getByText("RSVP’d classmates will be emailed when this is set.")).toBeVisible();
    await expect(brunch.getByRole("link", { name: /Add to calendar/ })).toHaveCount(0);
  });

  test("a database edit appears without a deploy", async ({ page, request }) => {
    const original = sql("select title from public.event_items where slug = 'sat-golf'");
    try {
      sql("update public.event_items set title = 'Golf Scramble (edited in DB)' where slug = 'sat-golf'");
      await revalidate(request);
      await page.reload();
      await expect(page.getByRole("heading", { name: "Golf Scramble (edited in DB)" })).toBeVisible();
    } finally {
      sql(`update public.event_items set title = '${original.replace(/'/g, "''")}' where slug = 'sat-golf'`);
      await revalidate(request);
    }
  });

  test("a partly-known item shows only the missing half as coming soon", async ({ page, request }) => {
    try {
      sql("update public.event_items set location_name = 'Test Venue', address = '1 Test St, Algonquin, IL' where slug = 'sun-brunch'");
      await revalidate(request);
      await page.reload();
      const card = page.locator("#sun-brunch");
      await expect(card.getByText("Time coming soon")).toBeVisible();
      await expect(card.getByText("Test Venue", { exact: true })).toBeVisible();
      await expect(card.getByRole("link", { name: /Map/ })).toBeVisible();
    } finally {
      sql("update public.event_items set location_name = null, address = null where slug = 'sun-brunch'");
      await revalidate(request);
    }
  });

  test("hidden items disappear and prices render once set", async ({ page, request }) => {
    try {
      sql("update public.event_items set visible = false where slug = 'fri-pregame'");
      sql("update public.event_items set price_cents = 6500 where slug = 'sat-dinner'");
      await revalidate(request);
      await page.reload();
      await expect(page.getByRole("heading", { name: "Pre-Game Drink" })).toHaveCount(0);
      await expect(page.locator("#sat-dinner").getByText("$65 per person")).toBeVisible();
    } finally {
      sql("update public.event_items set visible = true where slug = 'fri-pregame'");
      sql("update public.event_items set price_cents = null where slug = 'sat-dinner'");
      await revalidate(request);
    }
  });

  test("map links search the stored address", async ({ page }) => {
    const href = await page.locator("#fri-tour-jacobs").getByRole("link", { name: /Map/ }).getAttribute("href");
    expect(href).toContain("https://www.google.com/maps/search/?api=1&query=");
    expect(decodeURIComponent(href!)).toContain("2601 Bunker Hill Dr, Algonquin, IL 60102");
  });

  test("publishes schema.org Event data for scheduled items", async ({ page }) => {
    const json = await page.locator('script[type="application/ld+json"]').textContent();
    const events = JSON.parse(json!) as Array<{ "@type": string; startDate: string }>;
    expect(events).toHaveLength(8);
    expect(events.every((e) => e["@type"] === "Event" && e.startDate)).toBe(true);
  });
});

test.describe("calendar files", () => {
  test("single item .ics has correct UTC times and escaped location", async ({ page }) => {
    await unlock(page);
    const response = await page.request.get("/calendar/fri-tour-jacobs");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/calendar");
    expect(response.headers()["content-disposition"]).toContain("class-of-77-fri-tour-jacobs.ics");
    const raw = await response.text();
    for (const line of raw.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    const body = raw.replace(/\r\n /g, ""); // unfold (RFC 5545 §3.1)
    expect(body).toContain("BEGIN:VCALENDAR\r\n");
    expect(body).toContain("DTSTART:20271008T203000Z"); // 3:30 PM CDT
    expect(body).toContain("DTEND:20271008T213000Z");
    expect(body).toContain("LOCATION:Harry D. Jacobs High School\\, 2601 Bunker Hill Dr\\, Algonquin\\, IL 60102");
    expect(body).toContain("STATUS:CONFIRMED");
  });

  test("unconfirmed items are tentative; untimed items have no file", async ({ page }) => {
    await unlock(page);
    const game = await (await page.request.get("/calendar/fri-game-jacobs")).text();
    expect(game).toContain("STATUS:TENTATIVE");
    expect(game).not.toContain("DTEND");
    expect((await page.request.get("/calendar/sun-brunch")).status()).toBe(404);
    expect((await page.request.get("/calendar/no-such-item")).status()).toBe(404);
  });

  test("whole-weekend file contains every timed item", async ({ page }) => {
    await unlock(page);
    const body = await (await page.request.get("/calendar/all")).text();
    expect(body.match(/BEGIN:VEVENT/g)).toHaveLength(8);
  });

  test("calendar files are behind the site gate", async ({ request }) => {
    const response = await request.get("/calendar/all", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
  });
});

test.describe("operations endpoints", () => {
  test("revalidate and keep-alive reject callers without the secret", async ({ request }) => {
    expect((await request.post("/api/revalidate")).status()).toBe(401);
    expect((await request.get("/api/cron/keepalive")).status()).toBe(401);
  });

  test("keep-alive runs a database query with the cron secret", async ({ request }) => {
    const response = await request.get("/api/cron/keepalive", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? "local-cron-secret-123456"}` },
    });
    expect(response.status()).toBe(200);
    expect((await response.json()).ok).toBe(true);
  });
});
