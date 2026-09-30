"use server";

import { findClassmate } from "@/lib/classmates/match";
import { getYearbook, isYearbookSchool } from "@/lib/data/yearbooks";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { hasYearbookAccess } from "@/lib/yearbook/access";
import type { ReaderBook, YearbookSchool } from "@/lib/yearbook/types";

export type SeeMeBookResult =
  | { status: "ok"; book: ReaderBook; suggestion: { school: YearbookSchool; number: number } | null }
  | { status: "locked" }
  | { status: "unavailable" };

/**
 * Loads one yearbook for the "See Me in ’77" picker, plus the page where the
 * person's name was found in the senior roster (so most people land right on
 * their portrait). Allowed for anyone who can open the yearbooks, or whose
 * name is in the roster — the same classmate check as the yearbook gate.
 */
export async function loadSeeMeBook(
  school: string,
  person: { firstName: string; hsLastName: string; nickname?: string; currentLastName?: string },
): Promise<SeeMeBookResult> {
  if (!isYearbookSchool(school)) return { status: "unavailable" };
  const ip = clientKey(await headers());
  if (!(await rateLimit(`see-me:${ip}`, 60, 60 * 60))) return { status: "locked" };

  const first = String(person?.firstName ?? "").slice(0, 60);
  const last = String(person?.hsLastName ?? "").slice(0, 60);
  const match = first && last
    ? await findClassmate({
        firstName: first,
        hsLastName: last,
        nickname: String(person.nickname ?? "").slice(0, 60) || null,
        currentLastName: String(person.currentLastName ?? "").slice(0, 60) || null,
      })
    : null;
  if (!match && !(await hasYearbookAccess())) return { status: "locked" };

  const book = await getYearbook(school);
  if (!book) return { status: "unavailable" };

  let suggestion: { school: YearbookSchool; number: number } | null = null;
  if (match?.yearbook_page_id) {
    const here = book.pages.find((p) => p.id === match.yearbook_page_id);
    if (here) suggestion = { school, number: here.number };
    else if (match.school !== school) {
      const other = await getYearbook(match.school);
      const there = other?.pages.find((p) => p.id === match.yearbook_page_id);
      if (there) suggestion = { school: match.school, number: there.number };
    }
  }
  return { status: "ok", book, suggestion };
}
