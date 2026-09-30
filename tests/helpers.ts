import type { Page } from "@playwright/test";

export const PASSCODE = process.env.SITE_PASSCODE ?? "golden vikings";

/** Unlock through the real gate form, exactly as an organizer would. */
export async function unlock(page: Page, next = "/") {
  await page.goto(`/unlock${next === "/" ? "" : `?next=${encodeURIComponent(next)}`}`);
  await page.getByLabel("Class passcode").fill(PASSCODE);
  await page.getByRole("button", { name: "Open the reunion site" }).click();
  await page.waitForURL((url) => url.pathname === next.split("?")[0]);
}

export const PUBLIC_ROUTES = ["/", "/weekend", "/stay", "/rsvp", "/whos-coming", "/yearbooks", "/styleguide"];
