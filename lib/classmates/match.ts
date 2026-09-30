import { serviceDb } from "@/lib/supabase/admin";

/**
 * Classmate check (owner decision, Phase 5): does a name match someone in the
 * senior-class roster read from the yearbooks? Deliberately forgiving — a miss
 * only means the organizer approves by hand — but it needs the high-school last
 * name to match and a compatible first name, so random names don't pass.
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

/** Levenshtein distance ≤ 1 (one OCR slip), only for longer names. */
function nearlyEqual(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 6 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
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

/** Pure matcher (exported for tests): the best roster entry for a name, or null. */
export function matchClassmate(person: NameToMatch, roster: ClassmateCandidate[]): ClassmateCandidate | null {
  const lastKeys = [person.hsLastName, person.currentLastName].filter(Boolean).map((v) => nameKey(v!));
  const firsts = [person.firstName, person.nickname].filter((v): v is string => Boolean(v && v.trim()));
  let best: { c: ClassmateCandidate; score: number } | null = null;
  for (const c of roster) {
    const exactLast = lastKeys.includes(c.last_key);
    if (!exactLast && !lastKeys.some((k) => nearlyEqual(k, c.last_key))) continue;
    if (!firsts.some((f) => firstNamesCompatible(f, c.first_name))) continue;
    const exactFirst = firsts.some((f) => nameKey(f) === nameKey(c.first_name));
    const score = (exactLast ? 2 : 0) + (exactFirst ? 1 : 0);
    if (!best || score > best.score) best = { c, score };
  }
  return best?.c ?? null;
}

export async function findClassmate(person: NameToMatch): Promise<ClassmateCandidate | null> {
  const db = serviceDb();
  if (!db) return null;
  const { data, error } = await db
    .from("classmates")
    .select("id, school, first_name, last_name, last_key, yearbook_page_id");
  if (error) throw new Error(`Roster lookup failed: ${error.message}`);
  return matchClassmate(person, (data ?? []) as ClassmateCandidate[]);
}

/** True once a roster exists; before that nobody is held for review. */
export async function rosterLoaded(): Promise<boolean> {
  const db = serviceDb();
  if (!db) return false;
  const { count } = await db.from("classmates").select("id", { count: "exact", head: true });
  return (count ?? 0) > 0;
}
