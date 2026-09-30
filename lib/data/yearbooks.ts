import { serviceDb } from "@/lib/supabase/admin";
import { expiryFor, signedYearbookUrl, yearbookCdnConfigured } from "@/lib/yearbook/sign";
import type { ReaderBook, ReaderPage, YearbookSchool } from "@/lib/yearbook/types";

export const SCHOOL_NAMES: Record<YearbookSchool, { short: string; full: string }> = {
  crown: { short: "Crown ’77", full: "Irving Crown High School" },
  jacobs: { short: "Jacobs ’77", full: "Harry D. Jacobs High School" },
};

export function isYearbookSchool(value: string): value is YearbookSchool {
  return value === "crown" || value === "jacobs";
}

/**
 * Yearbooks are read with the service role: the tables have no anon policy
 * (SPEC §12.1: they sit behind the section gate). Returns null until both the
 * database and the image CDN are configured, so pages can show a designed
 * placeholder instead of an error.
 */
export async function getYearbook(school: YearbookSchool): Promise<ReaderBook | null> {
  const db = serviceDb();
  if (!db || !yearbookCdnConfigured()) return null;

  const [{ data: book, error: bookError }, { data: rows, error }] = await Promise.all([
    db.from("yearbook_books").select("school, title, seniors_start_seq, seniors_end_seq").eq("school", school).maybeSingle(),
    db
      .from("yearbook_pages")
      .select("id, seq, page_label, thumb_url, display_url, display_jpg_url, zoom_url, width, height")
      .eq("school", school)
      .eq("hidden", false)
      .order("seq"),
  ]);
  if (bookError || error) throw new Error(`Failed to load the ${school} yearbook: ${(bookError ?? error)?.message}`);
  if (!book || !rows || rows.length === 0) return null;

  const exp = expiryFor();
  const last = rows.length - 1;
  const pages: ReaderPage[] = rows.map((row, index) => ({
    id: row.id,
    seq: row.seq,
    number: index + 1,
    label: row.page_label ?? (index === 0 ? "Front cover" : index === last ? "Back cover" : `Page ${index + 1}`),
    width: row.width,
    height: row.height,
    thumb: signedYearbookUrl(row.thumb_url, exp),
    display: signedYearbookUrl(row.display_url, exp),
    displayJpg: signedYearbookUrl(row.display_jpg_url, exp),
    zoom: signedYearbookUrl(row.zoom_url, exp),
  }));

  // "Jump to seniors" is stored as file sequence; the reader works in page numbers.
  const firstAtOrAfter = (seq: number | null) => (seq === null ? null : pages.find((p) => p.seq >= seq)?.number ?? null);
  const lastAtOrBefore = (seq: number | null) =>
    seq === null ? null : ([...pages].reverse().find((p) => p.seq <= seq)?.number ?? null);

  return {
    school,
    title: book.title,
    shortName: SCHOOL_NAMES[school].short,
    schoolName: SCHOOL_NAMES[school].full,
    seniorsStart: firstAtOrAfter(book.seniors_start_seq),
    seniorsEnd: lastAtOrBefore(book.seniors_end_seq),
    pages,
  };
}

export interface YearbookSearchHit {
  number: number;
  label: string;
  snippet: string;
}

/** Name search over OCR text (feature flag `yearbook_ocr`). Plain substring match: OCR text is too noisy for stemming. */
export async function searchYearbook(school: YearbookSchool, query: string): Promise<YearbookSearchHit[]> {
  const db = serviceDb();
  const q = query.trim().replace(/\s+/g, " ");
  if (!db || q.length < 2 || q.length > 60) return [];
  const { data, error } = await db
    .from("yearbook_pages")
    .select("seq, ocr_text")
    .eq("school", school)
    .eq("hidden", false)
    .order("seq");
  if (error) throw new Error(`Yearbook search failed: ${error.message}`);

  const needle = q.toLowerCase();
  const hits: YearbookSearchHit[] = [];
  data.forEach((row, index) => {
    const text = (row.ocr_text ?? "").replace(/\s+/g, " ");
    const at = text.toLowerCase().indexOf(needle);
    if (at < 0) return;
    const start = Math.max(0, at - 40);
    const snippet = `${start > 0 ? "…" : ""}${text.slice(start, at + needle.length + 40).trim()}…`;
    hits.push({ number: index + 1, label: `Page ${index + 1}`, snippet });
  });
  return hits.slice(0, 30);
}

/** Front covers for the /yearbooks shelf (first visible page of each book). */
export async function getYearbookCovers(): Promise<Partial<Record<YearbookSchool, { thumb: string; display: string }>>> {
  const db = serviceDb();
  if (!db || !yearbookCdnConfigured()) return {};
  const exp = expiryFor();
  const covers: Partial<Record<YearbookSchool, { thumb: string; display: string }>> = {};
  await Promise.all(
    (["crown", "jacobs"] as const).map(async (school) => {
      const { data, error } = await db
        .from("yearbook_pages")
        .select("thumb_url, display_url")
        .eq("school", school)
        .eq("hidden", false)
        .order("seq")
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(`Failed to load the ${school} cover: ${error.message}`);
      if (data) covers[school] = { thumb: signedYearbookUrl(data.thumb_url, exp), display: signedYearbookUrl(data.display_url, exp) };
    }),
  );
  return covers;
}

/** True once both the image CDN and at least one yearbook page are in place. */
export async function yearbooksReady(): Promise<boolean> {
  const db = serviceDb();
  if (!db || !yearbookCdnConfigured()) return false;
  const { count } = await db.from("yearbook_pages").select("id", { count: "exact", head: true }).eq("hidden", false);
  return (count ?? 0) > 0;
}
