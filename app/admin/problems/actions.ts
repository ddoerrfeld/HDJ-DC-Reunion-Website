"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { requireServiceDb } from "@/lib/supabase/admin";

export async function clearProblems(): Promise<void> {
  await requireAdmin();
  await requireServiceDb().from("error_log").delete().lt("created_at", new Date(Date.now() + 60_000).toISOString());
  redirect("/admin/problems?ok=deleted");
}
