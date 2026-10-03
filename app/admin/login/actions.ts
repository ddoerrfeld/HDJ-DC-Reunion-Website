"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { consumeAdminToken, endAdminSession, sendAdminLink, startAdminSession } from "@/lib/admin/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/** Always the same answer, whether or not the address is an admin. */
export async function requestAdminLink(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) redirect("/admin/login?error=email");
  const ip = clientKey(await headers());
  const allowed = (await rateLimit(`admin-login:${ip}`, 5, 15 * 60)) && (await rateLimit(`admin-login-email:${email}`, 5, 60 * 60));
  if (allowed) {
    try {
      await sendAdminLink(email);
    } catch (e) {
      console.error("[admin] sign-in link failed", e);
      redirect("/admin/login?error=send");
    }
  }
  redirect("/admin/login?sent=1");
}

export async function completeAdminSignIn(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const ip = clientKey(await headers());
  if (!(await rateLimit(`admin-verify:${ip}`, 10, 15 * 60))) redirect("/admin/login?error=expired");
  const email = await consumeAdminToken(token);
  if (!email) redirect("/admin/login?error=expired");
  await startAdminSession(email);
  redirect("/admin");
}

export async function signOut(): Promise<void> {
  await endAdminSession();
  redirect("/admin/login?signedout=1");
}
