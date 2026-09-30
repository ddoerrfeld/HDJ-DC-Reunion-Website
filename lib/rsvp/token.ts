import { createHash, randomBytes } from "node:crypto";

/** Private edit-link token: 32 random bytes; only its SHA-256 is stored (SPEC §7.3). */
export function newEditToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashEditToken(token) };
}

export function hashEditToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function looksLikeToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}

export const RSVP_COOKIE = "c77_rsvp";
export const RSVP_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
