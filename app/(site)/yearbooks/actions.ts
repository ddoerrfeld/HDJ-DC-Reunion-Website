"use server";

import { isYearbookSchool, searchYearbook, type YearbookSearchHit } from "@/lib/data/yearbooks";
import { getFeatureFlags } from "@/lib/data/settings";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { findClassmate } from "@/lib/classmates/match";
import { safeNextPath } from "@/lib/gate";
import { rateLimit } from "@/lib/rate-limit";
import { grantYearbookAccess, hasYearbookAccess } from "@/lib/yearbook/access";

/** Name search over OCR text; only when the organizer has turned the feature on. */
export async function searchYearbookAction(school: string, query: string): Promise<YearbookSearchHit[]> {
  if (!isYearbookSchool(school) || typeof query !== "string") return [];
  if (!(await getFeatureFlags()).yearbookOcr || !(await hasYearbookAccess())) return [];
  return searchYearbook(school, query);
}

/**
 * "Confirm you're a classmate" (the yearbook section gate): the name used in
 * 1977 must match the senior roster. Rate limited per address.
 */
export async function verifyClassmateAction(formData: FormData): Promise<void> {
  const first = String(formData.get("firstName") ?? "").trim().slice(0, 60);
  const last = String(formData.get("lastName") ?? "").trim().slice(0, 60);
  const back = formData.get("back") === "/whos-coming" ? "/whos-coming" : "/yearbooks";
  const next = safeNextPath(String(formData.get("next") ?? back));
  const retry = (reason: string) => redirect(`${back}?verify=${reason}&next=${encodeURIComponent(next)}`);
  if (!first || !last) retry("missing");

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await rateLimit(`classmate-check:${ip}`, 10, 60 * 60))) retry("limit");

  const match = await findClassmate({ firstName: first, hsLastName: last });
  if (!match) retry("nomatch");
  await grantYearbookAccess();
  redirect(next.startsWith("/yearbooks") || next.startsWith("/whos-coming") ? next : back);
}
