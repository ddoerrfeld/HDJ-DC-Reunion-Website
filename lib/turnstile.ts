import { getSiteStage } from "@/lib/site";

/** Cloudflare Turnstile server verification (SPEC §3). */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Not configured: allowed in preview (local/testing), never in production.
    return getSiteStage() !== "production";
  }
  if (!token) return false;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    console.error("[turnstile]", error);
    return false;
  }
}

export function turnstileSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
}
