import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPublicSettings } from "@/lib/data/settings";
import { sendEmail } from "@/lib/email/send";
import { adminLoginEmail } from "@/lib/email/templates";
import { createGateToken, verifyGateToken, type GateConfig } from "@/lib/gate";
import { SITE_URL } from "@/lib/site";
import { requireServiceDb, serviceDb } from "@/lib/supabase/admin";

/**
 * Organizer sign-in (SPEC §11, adapted): a one-time link emailed through the
 * site's own Resend sender to addresses on the admin_users allowlist. The link
 * is single-use and expires in 15 minutes; the session cookie lasts 7 days and
 * is re-checked against the allowlist on every request, so removing an admin
 * signs them out everywhere.
 */
export const ADMIN_COOKIE = "c77_admin";
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const LINK_MINUTES = 15;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

function sessionConfig(email: string): GateConfig | null {
  const secret = process.env.SITE_GATE_SECRET ?? "";
  // The email is part of the key, so a session can't be re-pointed at another admin.
  return secret.length >= 32 ? { secret, passcode: `admin:${email.toLowerCase()}` } : null;
}

async function isAllowlisted(email: string): Promise<boolean> {
  const db = serviceDb();
  if (!db) return false;
  const { data } = await db.from("admin_users").select("email").ilike("email", email).maybeSingle();
  return Boolean(data);
}

/** Emails a sign-in link when the address is an admin. Callers always show the same message. */
export async function sendAdminLink(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  if (!email.includes("@") || email.length > 254 || !(await isAllowlisted(email))) return;
  const token = randomBytes(32).toString("base64url");
  const db = requireServiceDb();
  const { error } = await db.from("admin_login_tokens").insert({
    token_hash: hash(token),
    email,
    expires_at: new Date(Date.now() + LINK_MINUTES * 60_000).toISOString(),
  });
  if (error) throw new Error(`Could not create sign-in link: ${error.message}`);
  const { organizerContactEmail } = await getPublicSettings();
  await sendEmail({
    ...adminLoginEmail({ url: `${SITE_URL}/admin/login/verify?token=${token}`, minutes: LINK_MINUTES }),
    to: email,
    template: "admin-login",
    replyTo: organizerContactEmail,
  });
}

/** Uses a sign-in token once. Returns the admin's email, or null if invalid, used or expired. */
export async function consumeAdminToken(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const db = requireServiceDb();
  const { data } = await db
    .from("admin_login_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", hash(token))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("email")
    .maybeSingle();
  if (!data || !(await isAllowlisted(data.email))) return null;
  return data.email;
}

export async function startAdminSession(email: string): Promise<void> {
  const config = sessionConfig(email);
  if (!config) throw new Error("SITE_GATE_SECRET is not configured.");
  // The expiry is signed into the token, so the 7 days hold even if the cookie is kept longer.
  const token = await createGateToken(config, Date.now(), SESSION_SECONDS);
  (await cookies()).set(ADMIN_COOKIE, `${Buffer.from(email).toString("base64url")}~${token}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

/** The signed-in admin's email, or null. Checks the signature, expiry and the current allowlist. */
export async function getAdmin(): Promise<string | null> {
  const raw = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!raw || !raw.includes("~")) return null;
  const [encoded, token] = raw.split("~", 2);
  let email: string;
  try {
    email = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const config = sessionConfig(email);
  if (!config || !(await verifyGateToken(token, config))) return null;
  return (await isAllowlisted(email)) ? email : null;
}

/** For every admin page and server action. */
export async function requireAdmin(): Promise<string> {
  const email = await getAdmin();
  if (!email) redirect("/admin/login");
  return email;
}
