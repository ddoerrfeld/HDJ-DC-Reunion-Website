import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import sharp from "sharp";
import { removeStorage, sql } from "./db";
import { unlock } from "./helpers";

const HEIC = "tests/fixtures/iphone-gps.heic";
const JPEG = "tests/fixtures/camera-gps.jpg";
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

const unique = () => `rsvp-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

async function axeClean(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

/** Latest email body written by the preview "log" transport, for an address. */
function lastEmail(to: string, template?: string): string {
  return sql(
    `select body_text from public.email_log where to_email = '${to}' ${template ? `and template = '${template}'` : ""} order by created_at desc limit 1`,
  );
}
const editPath = (body: string) => body.match(/\/rsvp\/edit\/[A-Za-z0-9_-]{43}/)?.[0] ?? null;

async function fillAbout(page: Page, email: string) {
  await page.getByLabel("First name").fill("Susan");
  await page.getByLabel("Your last name in high school (maiden name, if it’s changed)").fill("Miller");
  await page.getByText("My last name has changed since high school").click();
  await page.getByLabel("Current last name").fill("Johnson");
  await page.getByLabel("Nickname or the name you went by").fill("Sue");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("City").fill("Algonquin");
  await page.getByText("Jacobs ’77", { exact: true }).click();
}

/** Runs the real photo pipeline over HTTP (what the browser does), returning the public 512 px WebP/JPEG. */
async function uploadViaApi(request: APIRequestContext, file: string) {
  const { uploadId, signedUrl } = await (await request.post("/api/photos/upload")).json();
  const fs = await import("node:fs/promises");
  const put = await request.put(signedUrl, { data: await fs.readFile(file), headers: { "content-type": "application/octet-stream" } });
  expect(put.ok()).toBe(true);
  const prepared = await request.post("/api/photos/prepare", { data: { uploadId } });
  return { uploadId, prepared };
}

test.describe.configure({ mode: "serial" });

test.describe("RSVP (SPEC §15 Phase 3)", () => {
  test.afterAll(() => {
    sql("delete from public.email_log where template like 'classmate-%' and attendee_id in (select id from public.attendees where email::text like 'rsvp-test-%')");
    sql("delete from public.attendees where email::text like 'rsvp-test-%'");
    sql("delete from public.email_log where to_email::text like 'rsvp-test-%'");
  });

  test("full RSVP with an iPhone HEIC photo, then the edit-link round trip", async ({ page, request }) => {
    const email = unique();
    await unlock(page, "/rsvp");
    await expect(page.getByRole("heading", { level: 2, name: "About you" })).toBeVisible();
    await axeClean(page);

    // Validation: plain-words errors, summary at the top, focus moved to it.
    await page.getByRole("button", { name: "Next" }).click();
    const summary = page.getByRole("alert").filter({ hasText: "Please fix" });
    await expect(summary).toBeFocused();
    await expect(summary.getByRole("link", { name: "Please enter your first name." })).toBeVisible();
    await expect(page.getByLabel("First name")).toHaveAttribute("aria-invalid", "true");
    await axeClean(page);

    await fillAbout(page, email);

    // A refresh doesn't wipe the form (sessionStorage).
    await page.reload();
    await expect(page.getByLabel("Email address")).toHaveValue(email);
    await expect(page.getByLabel("Current last name")).toHaveValue("Johnson");

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Photo" })).toBeFocused();
    await axeClean(page);

    // HEIC → converted server-side → crop → saved.
    const uploadsBefore = sql("select count(*) from storage.objects where bucket_id = 'photo-uploads'");
    await page.locator('input[type="file"]').setInputFiles(HEIC);
    await expect(page.getByText("Drag to position your face in the square.")).toBeVisible({ timeout: 30_000 });
    await axeClean(page);
    await page.getByRole("button", { name: "Rotate right" }).click();
    await page.getByRole("button", { name: "Use this photo" }).click();
    await expect(page.getByRole("img", { name: "Your photo" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Next" }).click();

    // Weekend: choice groups as radios, independent items as checkboxes, halftime checkbox.
    await expect(page.getByRole("heading", { level: 2, name: "Your weekend" })).toBeVisible();
    await axeClean(page);
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("link", { name: "Please choose at least one event." })).toBeVisible();
    await page.getByRole("radio", { name: /School Tour — Jacobs/ }).check();
    await page.getByRole("radio", { name: /Football: Jacobs vs\. Prairie Ridge/ }).check();
    await page.getByRole("checkbox", { name: /I plan to walk onto the field at halftime/ }).check();
    await page.getByRole("checkbox", { name: /Reunion Dinner/ }).check();
    await page.getByRole("button", { name: "Next" }).click();

    // Guests: names required only for the paid dinner.
    await expect(page.getByRole("heading", { level: 2, name: "Guests" })).toBeVisible();
    await page.getByRole("group", { name: "How many guests will join you at Reunion Dinner?" }).getByRole("radio", { name: "1 guest", exact: true }).check();
    await page.getByRole("group", { name: /Football: Jacobs/ }).getByRole("radio", { name: "2 guests", exact: true }).check();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("link", { name: "Please enter guest 1’s first name." })).toBeVisible();
    await axeClean(page);
    await page.getByLabel("Guest 1 first name").fill("Tom");
    await page.getByLabel("Guest 1 last name").fill("Johnson");
    await page.getByRole("button", { name: "Next" }).click();

    // Review.
    await expect(page.getByRole("heading", { level: 2, name: "Review" })).toBeVisible();
    await expect(page.getByText("Susan “Sue” (Miller) Johnson")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Show me on the Who’s Coming page/ })).toBeChecked();
    await axeClean(page);
    await expect(page.getByText("Payment details coming soon")).toBeVisible();
    await page.getByRole("button", { name: "Submit RSVP" }).click();

    // Confirmation. "Susan Miller" isn't in the senior roster: saved, but held for the organizer.
    await expect(page).toHaveURL(/\/rsvp\/confirmed\?review=1$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1, name: "See you in October" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "The organizer will confirm you shortly" })).toBeVisible();
    // No online payment: paid events are confirmed with a "details coming soon" placeholder.
    await expect(page.getByText("Payment details coming soon")).toBeVisible();
    await expect(page.getByText("Payment due")).toHaveCount(0);
    await axeClean(page);

    // Database state.
    const row = sql(`select id, hs_last_name, current_last_name, nickname, grad_school, photo_path, show_in_directory from public.attendees where email = '${email}'`);
    const [attendeeId, hsLast, currentLast, nickname, school, photoPath, shown] = row.split("|");
    expect([hsLast, currentLast, nickname, school, shown]).toEqual(["Miller", "Johnson", "Sue", "jacobs", "t"]);
    expect(photoPath).toMatch(/^p\/[0-9a-f-]{36}$/);
    const regs = sql(
      `select e.slug || ':' || r.status || ':' || r.guest_count || ':' || r.halftime_walk from public.registrations r join public.event_items e on e.id = r.event_item_id where r.attendee_id = '${attendeeId}' order by e.sort`,
    ).split("\n");
    expect(regs).toEqual(["fri-tour-jacobs:confirmed:0:false", "fri-game-jacobs:confirmed:2:true", "sat-dinner:confirmed:1:false"]);
    expect(sql(`select first_name || ' ' || last_name from public.guests g join public.registrations r on r.id = g.registration_id where r.attendee_id = '${attendeeId}'`)).toBe("Tom Johnson");

    // Stored photo: square, EXIF/GPS-free, in all three sizes; the original is gone.
    for (const [file, px] of [["512.webp", 512], ["160.webp", 160], ["512.jpg", 512]] as const) {
      const response = await request.get(`${process.env.SUPABASE_URL}/storage/v1/object/public/attendee-photos/${photoPath}/${file}`);
      expect(response.ok()).toBe(true);
      const meta = await sharp(await response.body()).metadata();
      expect([meta.width, meta.height]).toEqual([px, px]);
      expect(meta.exif, `${file} must carry no EXIF (GPS)`).toBeUndefined();
    }
    // The original and the working master were deleted after processing.
    expect(sql("select count(*) from storage.objects where bucket_id = 'photo-uploads'")).toBe(uploadsBefore);

    // Confirmation email with private edit link.
    const body = lastEmail(email, "rsvp-confirmation");
    expect(body).toContain("YOU’RE ON THE LIST!");
    expect(body).toContain("Reunion Dinner");
    expect(body).toContain("PAYMENT DETAILS COMING SOON");
    const link = editPath(body);
    expect(link).not.toBeNull();
    expect(sql(`select edit_token_hash from public.attendees where id = '${attendeeId}'`)).not.toContain(link!.split("/").pop()!);

    // Edit-link round trip: prefilled, change nickname, drop dinner, save.
    await page.goto(link!);
    await expect(page.getByRole("heading", { level: 1, name: "Change your RSVP" })).toBeVisible();
    await expect(page.getByLabel("Nickname or the name you went by")).toHaveValue("Sue");
    await axeClean(page);
    await page.getByLabel("Nickname or the name you went by").fill("Susie");
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("checkbox", { name: /Reunion Dinner/ }).uncheck();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/rsvp\/confirmed\?updated=1&review=1$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1, name: "RSVP updated" })).toBeVisible();
    expect(sql(`select nickname from public.attendees where id = '${attendeeId}'`)).toBe("Susie");
    expect(sql(`select count(*) from public.registrations r join public.event_items e on e.id = r.event_item_id where r.attendee_id = '${attendeeId}' and e.slug = 'sat-dinner'`)).toBe("0");
    expect(lastEmail(email, "rsvp-updated")).toContain("RSVP UPDATED");

    // Classmate check: the organizer got one review email with a signed approval link.
    expect(sql(`select classmate_status from public.attendees where id = '${attendeeId}'`)).toBe("pending");
    const review = sql(
      `select body_text from public.email_log where template = 'classmate-review' and attendee_id = '${attendeeId}' order by created_at desc limit 1`,
    );
    expect(review).toContain("A NEW RSVP NEEDS A QUICK CHECK");
    expect(sql(`select count(*) from public.email_log where template = 'classmate-review' and attendee_id = '${attendeeId}'`)).toBe("1");
    const approve = review.match(/\/rsvp\/approve\/[0-9a-f-]{36}\?s=[A-Za-z0-9_-]+/)?.[0];
    expect(approve).toBeTruthy();
    // A tampered signature is refused.
    const bad = await page.goto(approve!.replace(/s=.{4}/, "s=AAAA"));
    expect(bad?.status()).toBe(404);
    await page.goto(approve!);
    await expect(page.getByRole("heading", { level: 1, name: "Confirm a classmate" })).toBeVisible();
    await axeClean(page);
    await page.getByRole("button", { name: "Yes, this is a classmate" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Classmate confirmed" })).toBeVisible();
    expect(sql(`select classmate_status from public.attendees where id = '${attendeeId}'`)).toBe("approved");
    expect(lastEmail(email, "classmate-approved")).toContain("YOU’RE CONFIRMED!");
  });

  test("a classmate in the senior roster is confirmed at once and can link their ’77 portrait (See Me in ’77)", async ({ page, request }) => {
    const email = unique();
    await unlock(page, "/rsvp");
    await page.getByLabel("First name").fill("Donna");
    await page.getByLabel("Your last name in high school (maiden name, if it’s changed)").fill("Coleman");
    await page.getByLabel("Email address").fill(email);
    await page.getByText("Crown ’77", { exact: true }).click();
    await page.getByRole("button", { name: "Next" }).click();

    // The picker opens straight to the page where the roster found her name.
    await page.getByRole("button", { name: "Find my senior photo" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/We found your name on page \d+/)).toBeVisible({ timeout: 15_000 });
    await axeClean(page);
    await dialog.getByRole("button", { name: /^Open page \d+$/ }).click();
    await expect(dialog.getByRole("heading", { name: "Tap your photo" })).toBeVisible();
    await dialog.getByRole("button", { name: "Place the frame myself" }).click();
    await expect(dialog.getByRole("heading", { name: "Frame your portrait" })).toBeVisible();
    await axeClean(page);
    await dialog.getByRole("button", { name: "Looks right" }).click();
    await expect(page.getByRole("img", { name: "Your 1977 senior portrait" })).toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("radio", { name: /School Tour — Crown/ }).check();
    for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Submit RSVP" }).click();

    // Matched: no review note, yearbooks offered, portrait rendered from the yearbook asset.
    await expect(page).toHaveURL(/\/rsvp\/confirmed$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "The organizer will confirm you shortly" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "The yearbooks are open to you" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Your 1977 senior portrait" })).toBeVisible();
    const [status, thenPath, pageId] = sql(
      `select classmate_status, then_photo_path, yearbook_page_id from public.attendees where email = '${email}'`,
    ).split("|");
    expect(status).toBe("matched");
    expect(thenPath).toMatch(/^t\/[0-9a-f-]{36}$/);
    expect(pageId).toMatch(/^[0-9a-f-]{36}$/);
    const portrait = await request.get(`${process.env.SUPABASE_URL}/storage/v1/object/public/attendee-photos/${thenPath}/512.webp`);
    expect(portrait.ok()).toBe(true);
    const meta = await sharp(await portrait.body()).metadata();
    expect([meta.width, meta.height]).toEqual([512, 640]);
    expect(meta.exif).toBeUndefined();

    // With the launch-time yearbook gate on, this device is already let in.
    await page.context().addCookies([{ name: "c77_preview_section_gate", value: "1", domain: "localhost", path: "/" }]);
    await page.goto("/yearbooks/crown");
    await expect(page.getByRole("heading", { level: 1, name: /Crown ’77/ })).toBeVisible();

    // Deleting the RSVP removes the portrait too.
    const link = editPath(lastEmail(email, "rsvp-confirmation"))!;
    await page.goto(link);
    await page.getByRole("button", { name: "Delete my RSVP" }).click();
    await page.getByRole("button", { name: "Yes, delete my RSVP" }).click();
    await expect(page).toHaveURL(/\/rsvp\/deleted$/);
    const gone = await request.get(`${process.env.SUPABASE_URL}/storage/v1/object/public/attendee-photos/${thenPath}/512.webp`);
    expect(gone.status()).toBeGreaterThanOrEqual(400);
  });

  test("duplicate email: no second RSVP, a fresh link is emailed, the old link stops working", async ({ page }) => {
    const email = unique();
    sql(`select public.rsvp_create('{"person":{"firstName":"Chip","hsLastName":"Anderson","email":"${email}","gradSchool":"crown"},"selections":[{"slug":"fri-pregame"}]}'::jsonb, 'oldhash-${email}')`);

    await unlock(page, "/rsvp");
    await page.getByLabel("First name").fill("Robert");
    await page.getByLabel("Your last name in high school (maiden name, if it’s changed)").fill("Anderson");
    await page.getByLabel("Email address").fill(email.toUpperCase());
    await page.getByText("Crown ’77", { exact: true }).click();
    for (let i = 0; i < 2; i++) await page.getByRole("button", { name: /Next|Skip for now/ }).click();
    await page.getByRole("checkbox", { name: /Pre-Game Drink/ }).check();
    for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Submit RSVP" }).click();

    await expect(page).toHaveURL(/\/rsvp\/check-email\?reason=duplicate/);
    await expect(page.getByText("You’ve already RSVP’d with that email address")).toBeVisible();
    expect(sql(`select count(*) from public.attendees where email = '${email}'`)).toBe("1");
    expect(sql(`select first_name from public.attendees where email = '${email}'`)).toBe("Chip");
    const link = editPath(lastEmail(email, "edit-link"));
    expect(link).not.toBeNull();
    expect(sql(`select count(*) from public.attendees where edit_token_hash = 'oldhash-${email}'`)).toBe("0");

    await page.goto(link!);
    await expect(page.getByRole("heading", { level: 1, name: "Change your RSVP" })).toBeVisible();
    await page.goto("/rsvp/edit/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    await expect(page.getByRole("heading", { name: "This link isn’t valid anymore" })).toBeVisible();
  });

  test("lost link: generic response that doesn't reveal whether an email has an RSVP", async ({ page }) => {
    const nobody = unique();
    await unlock(page, "/rsvp/lost");
    await axeClean(page);
    await page.getByLabel("Email address").fill(nobody);
    await page.getByRole("button", { name: "Email me my link" }).click();
    await expect(page).toHaveURL(/\/rsvp\/check-email\?reason=lost/);
    await expect(page.getByText("If that email address has an RSVP, we’ve sent it a new private link")).toBeVisible();
    expect(sql(`select count(*) from public.email_log where to_email = '${nobody}'`)).toBe("0");
    await axeClean(page);
  });

  test("delete my RSVP removes personal data and the photo", async ({ page, request }) => {
    const email = unique();
    await unlock(page);
    const { uploadId, prepared } = await uploadViaApi(page.request, JPEG);
    expect(prepared.ok()).toBe(true);
    const { photoPath } = await (
      await page.request.post("/api/photos/finalize", { data: { uploadId, crop: { x: 10, y: 10, width: 60, height: 80 }, rotation: 0 } })
    ).json();
    sql(`select public.rsvp_create('{"person":{"firstName":"Del","hsLastName":"Eted","email":"${email}","gradSchool":"other"},"photoPath":"${photoPath}","selections":[{"slug":"sat-golf"}]}'::jsonb, 'x')`);
    // Issue a real link through the lost-link flow, then delete via the UI.
    await page.goto("/rsvp/lost");
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: "Email me my link" }).click();
    await page.goto(editPath(lastEmail(email, "edit-link"))!);
    await page.getByRole("button", { name: "Delete my RSVP" }).click();
    await page.getByRole("button", { name: "Yes, delete my RSVP" }).click();
    await expect(page).toHaveURL(/\/rsvp\/deleted$/);
    expect(sql(`select count(*) from public.attendees where email = '${email}'`)).toBe("0");
    const gone = await request.get(`${process.env.SUPABASE_URL}/storage/v1/object/public/attendee-photos/${photoPath}/512.webp`);
    expect(gone.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe("photo pipeline (SPEC §7.1, §12.2)", () => {
  for (const [label, file] of [["iPhone HEIC", HEIC], ["camera JPEG", JPEG]] as const) {
    test(`${label} with GPS: stored files have no EXIF, orientation applied`, async ({ page }) => {
      await unlock(page);
      const { uploadId, prepared } = await uploadViaApi(page.request, file);
      expect(prepared.ok()).toBe(true);
      const { previewUrl, width, height } = await prepared.json();
      // Both fixtures are landscape pixels flagged "rotate 90°": the master must come out portrait.
      expect(width).toBeLessThan(height);
      const master = await sharp(await (await page.request.get(previewUrl)).body()).metadata();
      expect(master.exif).toBeUndefined();

      const finalized = await page.request.post("/api/photos/finalize", {
        data: { uploadId, crop: { x: 0, y: 0, width: 100, height: 75 }, rotation: 90 },
      });
      expect(finalized.ok()).toBe(true);
      const { photoPath } = await finalized.json();
      for (const name of ["512.webp", "160.webp", "512.jpg"]) {
        const bytes = await (await page.request.get(`${process.env.SUPABASE_URL}/storage/v1/object/public/attendee-photos/${photoPath}/${name}`)).body();
        expect((await sharp(bytes).metadata()).exif, name).toBeUndefined();
        // Belt and braces: the raw bytes carry no Exif/GPS marker at all.
        expect(bytes.includes(Buffer.from("Exif"))).toBe(false);
      }
      await removeStorage("attendee-photos", ["512.webp", "160.webp", "512.jpg"].map((f) => `${photoPath}/${f}`));
    });
  }

  test("a non-image renamed to .jpg is rejected by content", async ({ page }) => {
    await unlock(page);
    const { uploadId, signedUrl } = await (await page.request.post("/api/photos/upload")).json();
    await page.request.put(signedUrl, { data: Buffer.from("this is not really a photo"), headers: { "content-type": "image/jpeg" } });
    const prepared = await page.request.post("/api/photos/prepare", { data: { uploadId } });
    expect(prepared.status()).toBe(422);
    expect((await prepared.json()).error).toContain("isn’t a photo we can use");
  });
});

test("rate limiter counts per key and window (SQL)", () => {
  const key = `test-${Date.now()}`;
  const results = [1, 2, 3, 4].map(() => sql(`select public.rate_limit_hit('${key}', 3, 60)`));
  expect(results).toEqual(["t", "t", "t", "f"]);
  sql(`delete from public.rate_limits where key = '${key}'`);
});
