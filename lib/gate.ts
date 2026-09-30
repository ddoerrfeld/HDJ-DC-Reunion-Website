/**
 * Stage A site-wide passcode gate (SPEC §12.1).
 *
 * The unlock cookie is `v1.<expiresEpochSeconds>.<hmac>`. The HMAC key is
 * derived from SITE_GATE_SECRET *and* the current passcode, so:
 *  - rotating SITE_PASSCODE invalidates every previously unlocked device, and
 *  - a leaked cookie can't be used to brute-force the (low-entropy) passcode
 *    offline, because the high-entropy secret is also part of the key.
 *
 * Uses Web Crypto only, so it runs in the proxy and in route handlers alike.
 */

export const GATE_COOKIE = "c77_gate";
export const GATE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 days
const MIN_SECRET_LENGTH = 32;
const TOKEN_VERSION = "v1";

export type UnlockError = "config" | "empty" | "wrong" | "locked";

export interface GateConfig {
  passcode: string;
  secret: string;
}

const encoder = new TextEncoder();

/** Case-, whitespace- and Unicode-form-insensitive, so "Golden  Eagles " matches "golden eagles". */
export function normalizePasscode(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

/** Returns null when the gate is not safely configured; callers must fail closed. */
export function getGateConfig(): GateConfig | null {
  const passcode = process.env.SITE_PASSCODE ?? "";
  const secret = process.env.SITE_GATE_SECRET ?? "";
  if (normalizePasscode(passcode).length === 0) return null;
  if (secret.length < MIN_SECRET_LENGTH) return null;
  return { passcode, secret };
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function signingKey(config: GateConfig): Promise<CryptoKey> {
  const material = encoder.encode(`${config.secret}\u0000${normalizePasscode(config.passcode)}`);
  const digest = await crypto.subtle.digest("SHA-256", material);
  return crypto.subtle.importKey("raw", digest, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function createGateToken(config: GateConfig, nowMs = Date.now()): Promise<string> {
  const expires = Math.floor(nowMs / 1000) + GATE_MAX_AGE_SECONDS;
  const payload = `${TOKEN_VERSION}.${expires}`;
  const signature = await crypto.subtle.sign("HMAC", await signingKey(config), encoder.encode(payload));
  return `${payload}.${toBase64Url(signature)}`;
}

export async function verifyGateToken(
  token: string | undefined,
  config: GateConfig,
  nowMs = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return false;
  const expires = Number(parts[1]);
  if (!Number.isInteger(expires) || expires * 1000 <= nowMs) return false;
  const signature = fromBase64Url(parts[2]);
  if (!signature) return false;
  // crypto.subtle.verify compares in constant time.
  return crypto.subtle.verify(
    "HMAC",
    await signingKey(config),
    signature,
    encoder.encode(`${parts[0]}.${parts[1]}`),
  );
}

/** Constant-time comparison: HMAC both values under the same key and verify one against the other. */
export async function passcodeMatches(input: string, config: GateConfig): Promise<boolean> {
  const key = await signingKey(config);
  const expected = await crypto.subtle.sign("HMAC", key, encoder.encode(normalizePasscode(config.passcode)));
  return crypto.subtle.verify("HMAC", key, expected, encoder.encode(normalizePasscode(input)));
}

/** Only same-site relative paths; never back to the gate itself (prevents open redirects and loops). */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (value.startsWith("/unlock") || value.startsWith("/api/")) return "/";
  return value;
}

/** Paths reachable without the site passcode. Admin keeps its own login (SPEC §12.1). */
export function isGateExempt(pathname: string): boolean {
  return (
    pathname === "/unlock" ||
    pathname === "/api/unlock" ||
    pathname === "/robots.txt" ||
    pathname === "/icon.svg" ||
    pathname === "/apple-icon.png" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/textures/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/stripe/webhook") ||
    pathname === "/api/revalidate" ||
    pathname.startsWith("/api/cron/")
  );
}
