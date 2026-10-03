"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { refreshSite } from "@/lib/admin/util";
import { SITE_TEXT } from "@/lib/content/site-text";
import { requireServiceDb } from "@/lib/supabase/admin";

/** Stores only text that differs from the built-in default; a blank field goes back to the default. */
export async function saveSiteText(form: FormData): Promise<void> {
  await requireAdmin();
  const overrides: Record<string, string> = {};
  for (const entry of SITE_TEXT) {
    const raw = form.get(entry.key);
    if (typeof raw !== "string") continue;
    // Lines are single-line; collapse pasted line breaks.
    const value = (entry.kind === "line" ? raw.replace(/\s*\n\s*/g, " ") : raw.replace(/\r\n/g, "\n")).trim().slice(0, 2000);
    if (value && value !== entry.default) overrides[entry.key] = value;
  }
  const { error } = await requireServiceDb().from("settings").upsert({ key: "site_text", value: overrides, is_public: true });
  if (error) redirect(`/admin/content?error=${encodeURIComponent(error.message)}`);
  refreshSite();
  const group = String(form.get("group") ?? "");
  redirect(`/admin/content?ok=saved${group ? `#${group}` : ""}`);
}
