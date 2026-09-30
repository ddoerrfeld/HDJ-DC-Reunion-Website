import { expect, test } from "@playwright/test";
import { PASSCODE, PUBLIC_ROUTES, unlock } from "./helpers";

test.describe("site-wide passcode gate (SPEC §12.1)", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`redirects ${route} to the gate when locked`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/unlock/);
      await expect(page.getByRole("heading", { level: 1, name: "Class of ’77" })).toBeVisible();
    });
  }

  test("rejects a wrong passcode with a plain-language error", async ({ page }) => {
    await page.goto("/unlock");
    await page.getByLabel("Class passcode").fill("wrong guess");
    await page.getByRole("button", { name: "Open the reunion site" }).click();
    await expect(page.getByText("That passcode didn’t match. Please check it and try again.")).toBeVisible();
    await expect(page.getByLabel("Class passcode")).toHaveAttribute("aria-invalid", "true");
  });

  test("rejects an empty passcode", async ({ page }) => {
    await page.goto("/unlock");
    await page.getByLabel("Class passcode").evaluate((el) => el.removeAttribute("required"));
    await page.getByRole("button", { name: "Open the reunion site" }).click();
    await expect(page.getByText("Please enter the class passcode.")).toBeVisible();
  });

  test("accepts the passcode ignoring case and extra spaces, returns to the requested page", async ({ page }) => {
    await page.goto("/weekend");
    await expect(page).toHaveURL(/\/unlock\?next=%2Fweekend/);
    await page.getByLabel("Class passcode").fill(`  ${PASSCODE.toUpperCase().replace(" ", "   ")} `);
    await page.getByRole("button", { name: "Open the reunion site" }).click();
    await expect(page).toHaveURL(/\/weekend$/);
  });

  test("remembers the device for 180 days with an httpOnly cookie", async ({ page, context }) => {
    await unlock(page);
    const cookie = (await context.cookies()).find((c) => c.name === "c77_gate");
    expect(cookie).toBeDefined();
    expect(cookie!.httpOnly).toBe(true);
    expect(cookie!.sameSite).toBe("Lax");
    const days = (cookie!.expires * 1000 - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(179.9);
    expect(days).toBeLessThanOrEqual(180);

    // A fresh page in the same browser (same device) stays unlocked.
    const second = await context.newPage();
    await second.goto("/stay");
    await expect(second).toHaveURL(/\/stay$/);
  });

  test("rejects a tampered cookie", async ({ page, context }) => {
    await unlock(page);
    const cookie = (await context.cookies()).find((c) => c.name === "c77_gate")!;
    const [v, exp, sig] = cookie.value.split(".");
    const forged = `${v}.${Number(exp) + 86_400 * 365}.${sig}`;
    await context.addCookies([{ ...cookie, value: forged }]);
    await page.goto("/weekend");
    await expect(page).toHaveURL(/\/unlock/);
  });

  test("never redirects off-site after unlocking", async ({ request }) => {
    const response = await request.post("/api/unlock", {
      form: { passcode: PASSCODE, next: "//evil.example.com/phish" },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(303);
    expect(new URL(response.headers()["location"]).pathname).toBe("/");
    expect(new URL(response.headers()["location"]).host).toMatch(/^localhost/);
  });

  test("sends noindex headers and a disallow-all robots.txt in preview", async ({ request }) => {
    const gate = await request.get("/unlock");
    expect(gate.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toMatch(/Disallow: \/\s*$/m);
  });

  test("returns 401 JSON for locked API routes instead of redirecting", async ({ request }) => {
    const response = await request.get("/api/anything", { maxRedirects: 0 });
    expect(response.status()).toBe(401);
  });
});
