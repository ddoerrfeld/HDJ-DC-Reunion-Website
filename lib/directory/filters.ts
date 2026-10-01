import type { DayKey, DirectoryPerson, DirectorySchool } from "@/lib/data/directory";
import { foldForSearch } from "@/lib/names";

/** Who’s Coming filters (SPEC §9.3). Pure: used by the server page (URL → state) and the client. */
export type SchoolFilter = "all" | DirectorySchool;
export type SortKey = "hs" | "current" | "recent";

export interface Filters {
  q: string;
  school: SchoolFilter;
  acts: string[];
  match: "any" | "all";
  days: DayKey[];
  photo: boolean;
  then: boolean;
  sort: SortKey;
}

export const DEFAULTS: Filters = { q: "", school: "all", acts: [], match: "any", days: [], photo: false, then: false, sort: "hs" };
export const DAYS: Array<{ key: DayKey; label: string }> = [
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];
export const SCHOOLS: Array<{ key: SchoolFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "crown", label: "Crown" },
  { key: "jacobs", label: "Jacobs" },
  { key: "other", label: "Other" },
];
export const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "hs", label: "Last name in high school (A–Z)" },
  { key: "current", label: "Last name now (A–Z)" },
  { key: "recent", label: "Most recent RSVPs" },
];

/** URL ⇄ filters (SPEC §9.3: shareable, back-button safe). */
export function parseFilters(params: Record<string, string | undefined>): Filters {
  const list = (v?: string) => (v ? v.split(",").filter(Boolean) : []);
  const school = params.school as SchoolFilter;
  const sort = params.sort as SortKey;
  return {
    q: (params.q ?? "").slice(0, 60),
    school: ["crown", "jacobs", "other"].includes(school) ? school : "all",
    acts: list(params.acts),
    match: params.match === "all" ? "all" : "any",
    days: list(params.days).filter((d): d is DayKey => d === "fri" || d === "sat" || d === "sun"),
    photo: params.photo === "1",
    then: params.then === "1",
    sort: sort === "current" || sort === "recent" ? sort : "hs",
  };
}

export function toQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.school !== "all") p.set("school", f.school);
  if (f.acts.length) p.set("acts", f.acts.join(","));
  if (f.match === "all" && f.acts.length > 1) p.set("match", "all");
  if (f.days.length) p.set("days", f.days.join(","));
  if (f.photo) p.set("photo", "1");
  if (f.then) p.set("then", "1");
  if (f.sort !== "hs") p.set("sort", f.sort);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function activeCount(f: Filters): number {
  return (f.q.trim() ? 1 : 0) + (f.school !== "all" ? 1 : 0) + f.acts.length + f.days.length + (f.photo ? 1 : 0) + (f.then ? 1 : 0);
}

export function applyFilters(people: DirectoryPerson[], f: Filters): DirectoryPerson[] {
  const terms = foldForSearch(f.q).split(/\s+/).filter(Boolean);
  const result = people.filter((p) => {
    if (terms.length && !terms.every((t) => p.searchText.includes(t))) return false;
    if (f.school !== "all" && p.school !== f.school) return false;
    if (f.acts.length) {
      const has = (slug: string) => p.activities.includes(slug);
      if (f.match === "all" ? !f.acts.every(has) : !f.acts.some(has)) return false;
    }
    if (f.days.length && !f.days.some((d) => p.days.includes(d))) return false;
    if (f.photo && !p.photo) return false;
    if (f.then && !p.then) return false;
    return true;
  });
  const by = (key: (p: DirectoryPerson) => string) => (a: DirectoryPerson, b: DirectoryPerson) =>
    key(a).localeCompare(key(b), "en", { sensitivity: "base" }) || a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  if (f.sort === "recent") return result.sort((a, b) => a.recentRank - b.recentRank);
  return result.sort(by((p) => (f.sort === "current" ? p.currentLastName : p.hsLastName)));
}

