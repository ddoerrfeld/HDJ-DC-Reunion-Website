export type SiteStage = "preview" | "production";

/**
 * SPEC §12.1: the stage is controlled by env var, never by code edits.
 * Anything other than an explicit "production" is treated as preview, so a
 * missing or misspelled value fails safe (gated, noindex).
 */
export function getSiteStage(): SiteStage {
  return process.env.SITE_STAGE === "production" ? "production" : "preview";
}

export function isPreview(): boolean {
  return getSiteStage() === "preview";
}

export const SITE_NAME = "Class of ’77 · 50-Year Reunion";
export const SITE_DESCRIPTION =
  "Irving Crown & Harry D. Jacobs High Schools, Class of 1977 — together again October 8–10, 2027.";

/** Canonical origin — used in calendar files, emails, and structured data. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://crownjacobs77.com").replace(/\/$/, "");
