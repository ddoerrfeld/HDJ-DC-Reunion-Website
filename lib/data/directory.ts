import { getEventItems } from "@/lib/data/events";
import { foldForSearch, formatDisplayName } from "@/lib/names";
import { photoUrl } from "@/lib/photos";
import { publicDb } from "@/lib/supabase/server";
import { YearbookCropSchema, type YearbookCrop } from "@/lib/yearbook/crop";
import { thenPhotoUrl } from "@/lib/yearbook/portrait";

export type DirectorySchool = "crown" | "jacobs" | "other";
export type DayKey = "fri" | "sat" | "sun";

export interface DirectoryActivity {
  slug: string;
  title: string;
  day: DayKey;
}

/** Exactly what the browser receives per person (SPEC §9.1). Nothing else leaves the server. */
export interface DirectoryPerson {
  id: string;
  name: string;
  /** Folded first, nickname, high-school and current last names, for search. */
  searchText: string;
  /** For sorting and the A–Z bar. */
  hsLastName: string;
  currentLastName: string;
  school: DirectorySchool;
  photo: string | null;
  photoSmall: string | null;
  /** Null when the yearbooks are closed to this visitor (same rule as the yearbooks). */
  then: { photo: string; school: "crown" | "jacobs"; page: number; crop: YearbookCrop } | null;
  activities: string[];
  days: DayKey[];
  recentRank: number;
}

export interface DirectoryData {
  people: DirectoryPerson[];
  activities: Array<DirectoryActivity & { count: number }>;
  unlisted: number;
}

const DAY_BY_DATE: Record<string, DayKey> = { "2027-10-08": "fri", "2027-10-09": "sat", "2027-10-10": "sun" };

/** Who's Coming data via the public functions (anon key, RLS-safe). Empty when Supabase isn't configured (preview). */
export async function getDirectory({ includeThen }: { includeThen: boolean }): Promise<DirectoryData> {
  const db = publicDb();
  if (!db) return { people: [], activities: [], unlisted: 0 };
  const [{ data: rows, error }, { data: unlisted, error: countError }, events] = await Promise.all([
    db.rpc("directory_entries"),
    db.rpc("directory_unlisted_count"),
    getEventItems(),
  ]);
  if (error || countError) throw new Error(`Failed to load the directory: ${(error ?? countError)?.message}`);

  const counts = new Map<string, number>();
  const people: DirectoryPerson[] = (rows ?? []).map((row) => {
    const acts = (Array.isArray(row.activities) ? row.activities : []) as Array<{ slug: string; title: string; day: string }>;
    for (const a of acts) counts.set(a.slug, (counts.get(a.slug) ?? 0) + 1);
    const crop = YearbookCropSchema.safeParse(row.yearbook_crop);
    const thenPhoto = thenPhotoUrl(row.then_photo_path);
    return {
      id: row.id,
      name: formatDisplayName({
        firstName: row.first_name,
        hsLastName: row.hs_last_name,
        currentLastName: row.current_last_name,
        nickname: row.nickname,
      }),
      searchText: foldForSearch([row.first_name, row.nickname, row.hs_last_name, row.current_last_name].filter(Boolean).join(" ")),
      hsLastName: row.hs_last_name,
      currentLastName: row.current_last_name || row.hs_last_name,
      school: row.grad_school,
      photo: photoUrl(row.photo_path, 512),
      photoSmall: photoUrl(row.photo_path, 160),
      then:
        includeThen && thenPhoto && row.yearbook_school && row.yearbook_page_number && crop.success
          ? { photo: thenPhoto, school: row.yearbook_school, page: row.yearbook_page_number, crop: crop.data }
          : null,
      activities: acts.map((a) => a.slug),
      days: [...new Set(acts.map((a) => DAY_BY_DATE[a.day] ?? "sat"))],
      recentRank: row.recent_rank,
    };
  });

  // Activity filters in weekend order; only events someone listed has chosen.
  const activities = events
    .filter((e) => counts.has(e.slug))
    .map((e) => ({ slug: e.slug, title: e.title, day: DAY_BY_DATE[e.day] ?? "sat", count: counts.get(e.slug)! }));
  return { people, activities, unlisted: unlisted ?? 0 };
}
