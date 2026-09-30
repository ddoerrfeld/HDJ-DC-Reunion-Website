import { createHmac } from "node:crypto";

/**
 * Yearbook images live on a Cloudflare Worker (yearbook-cdn/) that serves only
 * URLs signed here. Expiry is rounded to the end of tomorrow (UTC), so a page's
 * URLs stay identical for a day and browsers cache them, while a copied link
 * stops working within 48 hours.
 */
const DAY = 86_400;

export function yearbookCdnConfigured(): boolean {
  return Boolean(process.env.YEARBOOK_CDN_URL && process.env.YEARBOOK_SIGNING_SECRET);
}

export function expiryFor(nowSeconds = Math.floor(Date.now() / 1000)): number {
  return (Math.floor(nowSeconds / DAY) + 2) * DAY;
}

export function signPath(path: string, exp: number, secret: string): string {
  return createHmac("sha256", secret).update(`${path}:${exp}`).digest("base64url");
}

/** Full signed URL for an asset path as stored in yearbook_pages (e.g. "crown/090-ab12/d.webp"). */
export function signedYearbookUrl(assetPath: string, exp = expiryFor()): string {
  const base = process.env.YEARBOOK_CDN_URL;
  const secret = process.env.YEARBOOK_SIGNING_SECRET;
  if (!base || !secret) throw new Error("Yearbook CDN is not configured (YEARBOOK_CDN_URL, YEARBOOK_SIGNING_SECRET).");
  const path = `/${assetPath.replace(/^\/+/, "")}`;
  return `${base.replace(/\/+$/, "")}${path}?e=${exp}&s=${signPath(path, exp, secret)}`;
}
