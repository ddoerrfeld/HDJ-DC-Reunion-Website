import { expect, test } from "@playwright/test";

/**
 * Launch rehearsal (SPEC §15 Phase 8 cutover): what the site does once
 * SITE_STAGE=production. Runs only against a production-stage build:
 *   SITE_STAGE=production npm run build && SITE_STAGE=production npm run start -- -p 3100
 *   SITE_STAGE=production npx playwright test tests/launch.spec.ts --project=chromium
 */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://crownjacobs77.com").replace(/\/$/, "");
const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

test.skip(process.env.SITE_STAGE !== "production", "launch rehearsal needs a production-stage build");

test("public pages open without the passcode, can be indexed, and carry the share image", async ({ page, request }) => {
  for (const path of ["/", "/weekend", "/stay", "/rsvp"]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(200);
    expect(res.headers()["x-robots-tag"], path).toBeUndefined();
    expect(res.headers()["content-security-policy"], path).toContain("frame-ancestors 'none'");
  }
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Private preview")).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(og).toMatch(new RegExp(`^${esc(SITE)}/opengraph-image\\.png`));
  const img = await request.get(new URL(og!).pathname + new URL(og!).search);
  expect(img.headers()["content-type"]).toBe("image/png");
});

test("robots.txt and sitemap list only public pages; private areas stay unindexed", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Allow: /");
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const p of ["/weekend", "/stay", "/rsvp"]) expect(sitemap).toContain(`${SITE}${p}`);
  expect(sitemap).not.toContain("/yearbooks");
  expect((await request.get("/admin/login")).headers()["x-robots-tag"]).toContain("noindex");
});

test("yearbooks and Who’s Coming are for confirmed classmates; preview-only tools are gone", async ({ page, request }) => {
  await page.goto("/yearbooks");
  await expect(page.getByRole("heading", { name: "Confirm you’re a classmate" })).toBeVisible();
  await page.goto("/whos-coming");
  await expect(page.getByRole("heading", { name: "Confirm you’re a classmate" })).toBeVisible();
  expect((await request.get("/styleguide")).status()).toBe(404);
  expect((await request.get("/api/preview/section-gate?on=0")).status()).toBe(404);
  expect((await request.get("/api/health")).status()).toBe(200);
});
