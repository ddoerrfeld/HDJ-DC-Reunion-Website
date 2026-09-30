// Shared by the Cloudflare Worker (index.js) and the local test server
// (scripts/yearbook-cdn-dev.mts). The site signs with the same scheme in
// lib/yearbook/sign.ts: base64url(HMAC-SHA256(secret, "<path>:<exp>")).

const encoder = new TextEncoder();

/** @param {string} secret */
async function key(secret) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
}

/** @param {string} value */
function fromBase64Url(value) {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/**
 * True when `sig` is a valid, unexpired signature for `path`.
 * @param {string} path  URL pathname, e.g. "/crown/090-ab12cd34ef/d.webp"
 * @param {string | null} exp  expiry, unix seconds
 * @param {string | null} sig
 * @param {string} secret
 * @param {number} [now] unix seconds
 */
export async function verifySignedPath(path, exp, sig, secret, now = Math.floor(Date.now() / 1000)) {
  if (!secret || !exp || !sig || !/^\d{1,12}$/.test(exp) || Number(exp) < now) return false;
  try {
    return await crypto.subtle.verify("HMAC", await key(secret), fromBase64Url(sig), encoder.encode(`${path}:${exp}`));
  } catch {
    return false;
  }
}

/** Response headers for a verified asset: browser cache until the URL expires. */
export function assetHeaders(exp, now = Math.floor(Date.now() / 1000)) {
  return {
    "Cache-Control": `private, max-age=${Math.max(0, Number(exp) - now)}`,
    "X-Robots-Tag": "noindex, nofollow, noimageindex",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
}
