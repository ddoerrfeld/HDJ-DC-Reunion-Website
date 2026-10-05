/**
 * Content-Security-Policy, built per request in proxy.ts from the runtime
 * environment (so the image and database origins always match where the site
 * actually loads them from). Next.js streams page data in inline scripts, so
 * 'unsafe-inline' stays; no third-party script, frame or plugin can load.
 */
const origin = (url: string | undefined) => {
  try {
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
};

export function contentSecurityPolicy(): string {
  const supabase = origin(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL);
  const yearbooks = origin(process.env.YEARBOOK_CDN_URL);
  const dev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabase} ${yearbooks}`.trim(),
    "font-src 'self'",
    `connect-src 'self' ${supabase}${dev ? " ws:" : ""}`.trim(),
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
