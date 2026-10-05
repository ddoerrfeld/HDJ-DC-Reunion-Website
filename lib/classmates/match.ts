import { serviceDb } from "@/lib/supabase/admin";

/**
 * Classmate check (owner decision, Phase 5): does a name match someone in the
 * senior-class roster read from the yearbooks? Deliberately forgiving — a miss
 * only means the organizer approves by hand — but it needs a matching (or
 * nearly matching) last name plus a first name that fits, so random names don't pass.
 */

/** Lower case, accents removed, letters only: "O’Brien" → "obrien", "De Bartolo" → "debartolo". */
export function nameKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

// Common American given-name forms of the 1950s–60s. Each group is interchangeable.
const NICKNAME_GROUPS = [
  "robert rob robbie bob bobby bert",
  "william will bill billy willie liam",
  "richard rick ricky rich dick",
  "james jim jimmy jamie",
  "john jack johnny jon",
  "michael mike mikey mick",
  "thomas tom tommy",
  "joseph joe joey",
  "david dave davey",
  "daniel dan danny",
  "stephen steven steve stevie",
  "christopher chris kit",
  "anthony tony",
  "edward ed eddie ted teddy ned",
  "charles charlie chuck chas",
  "gregory greg",
  "timothy tim timmy",
  "kenneth ken kenny",
  "ronald ron ronnie",
  "donald don donnie",
  "douglas doug",
  "gerald gerry jerry",
  "jeffrey jeff geoffrey",
  "lawrence larry",
  "raymond ray",
  "patrick pat patty patricia trish tricia",
  "matthew matt",
  "andrew andy drew",
  "nicholas nick nicky",
  "peter pete",
  "samuel sam sammy",
  "frederick fred freddie",
  "alexander alex al",
  "albert al bert",
  "alan allan allen al",
  "terrence terence terry",
  "leonard leo len lenny",
  "philip phillip phil",
  "benjamin ben benny",
  "francis frank frankie",
  "henry hank harry",
  "walter walt wally",
  "gary garry",
  "elizabeth liz lizzie beth betsy betty eliza libby",
  "margaret peggy peg maggie meg marge margie",
  "katherine catherine kathryn kathy cathy kate katie kay kitty",
  "deborah debra debbie deb debby",
  "susan sue susie suzy suzanne",
  "barbara barb barbie babs",
  "patricia pat patty patti trish",
  "jennifer jenny jen jenni",
  "cynthia cindy",
  "pamela pam pammy",
  "kimberly kim kimmy",
  "rebecca becky becca",
  "victoria vicki vicky tori",
  "theresa teresa terri terry tess",
  "christine christina chris chrissy tina",
  "judith judy jude",
  "sandra sandy",
  "diane dianne diana di",
  "janet jan",
  "carol carole caroline carolyn carrie",
  "nancy nan",
  "linda lindy",
  "lori laurie lorrie",
  "cheryl sheryl cherie",
  "sharon shari sherry",
  "kathleen kathy kathie kath",
  "jacqueline jackie jacquie",
  "dorothy dot dottie",
  "virginia ginny ginger",
  "mary mae molly polly",
  "tamara tammy tammie",
  "denise dee",
  "gail gayle",
].map((group) => new Set(group.split(" ")));

export function firstNamesCompatible(a: string, b: string): boolean {
  const x = nameKey(a);
  const y = nameKey(b);
  if (!x || !y) return false;
  if (x === y) return true;
  // "Chris" / "Christopher", "Deb" / "Debra": one is a 3+ letter prefix of the other.
  if (x.length >= 3 && y.length >= 3 && (x.startsWith(y) || y.startsWith(x))) return true;
  return NICKNAME_GROUPS.some((group) => group.has(x) && group.has(y));
}

/** Edit distance (insertions, deletions, substitutions). */
export function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)));
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Last names that differ only by text-extraction (OCR) slips or a typo:
 * one letter for names of 5+ letters, two for 8+ ("Doerfield" / "Doerrfeld").
 */
export function lastNamesClose(a: string, b: string): boolean {
  if (a === b) return true;
  const shorter = Math.min(a.length, b.length);
  const allowed = shorter >= 8 ? 2 : shorter >= 5 ? 1 : 0;
  return allowed > 0 && Math.abs(a.length - b.length) <= allowed && editDistance(a, b) <= allowed;
}

/** Owner rule: with the same last name, the same first initial is enough ("Cathy" for "Catherine", "Bud" for "Bernard"). */
function sameInitial(a: string, b: string): boolean {
  const x = nameKey(a);
  const y = nameKey(b);
  return Boolean(x && y && x[0] === y[0]);
}

export interface ClassmateCandidate {
  id: string;
  school: "crown" | "jacobs";
  first_name: string;
  last_name: string;
  last_key: string;
  yearbook_page_id: string | null;
}

export interface NameToMatch {
  firstName: string;
  hsLastName: string;
  nickname?: string | null;
  currentLastName?: string | null;
}

/**
 * Pure matcher (exported for tests): the best roster entry for a name, or null.
 *  - exact last name (high-school or current) + a compatible first name or the same first initial;
 *  - a close last name (OCR slip or typo) + a compatible first name (nickname, prefix or exact).
 */
export function matchClassmate(person: NameToMatch, roster: ClassmateCandidate[]): ClassmateCandidate | null {
  const lastKeys = [person.hsLastName, person.currentLastName].filter(Boolean).map((v) => nameKey(v!)).filter(Boolean);
  const firsts = [person.firstName, person.nickname].filter((v): v is string => Boolean(v && v.trim()));
  let best: { c: ClassmateCandidate; score: number } | null = null;
  for (const c of roster) {
    const exactLast = lastKeys.includes(c.last_key);
    if (!exactLast && !lastKeys.some((k) => lastNamesClose(k, c.last_key))) continue;
    const exactFirst = firsts.some((f) => nameKey(f) === nameKey(c.first_name));
    const compatible = exactFirst || firsts.some((f) => firstNamesCompatible(f, c.first_name));
    const initial = compatible || firsts.some((f) => sameInitial(f, c.first_name));
    if (!(exactLast ? initial : compatible)) continue;
    const score = (exactLast ? 4 : 0) + (exactFirst ? 2 : 0) + (compatible ? 1 : 0);
    if (!best || score > best.score) best = { c, score };
  }
  return best?.c ?? null;
}

export async function loadRoster(): Promise<ClassmateCandidate[]> {
  const db = serviceDb();
  if (!db) return [];
  const { data, error } = await db.from("classmates").select("id, school, first_name, last_name, last_key, yearbook_page_id");
  if (error) throw new Error(`Roster lookup failed: ${error.message}`);
  return (data ?? []) as ClassmateCandidate[];
}

export async function findClassmate(person: NameToMatch): Promise<ClassmateCandidate | null> {
  return matchClassmate(person, await loadRoster());
}

/** For the organizer: list entries whose last name is close to this one (for spotting misread names). */
export function similarClassmates(person: NameToMatch, roster: ClassmateCandidate[], limit = 5): ClassmateCandidate[] {
  const keys = [person.hsLastName, person.currentLastName].filter(Boolean).map((v) => nameKey(v!)).filter(Boolean);
  if (!keys.length) return [];
  return roster
    .map((c) => ({ c, d: Math.min(...keys.map((k) => editDistance(k, c.last_key))) }))
    .filter(({ c, d }) => d <= Math.max(2, Math.floor(c.last_key.length / 3)))
    .sort((a, b) => a.d - b.d || a.c.last_name.localeCompare(b.c.last_name))
    .slice(0, limit)
    .map(({ c }) => c);
}

/** True once a roster exists; before that nobody is held for review. */
export async function rosterLoaded(): Promise<boolean> {
  const db = serviceDb();
  if (!db) return false;
  const { count } = await db.from("classmates").select("id", { count: "exact", head: true });
  return (count ?? 0) > 0;
}
