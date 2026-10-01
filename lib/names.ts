/**
 * SPEC §9.1 display name: `First “Nick” (HighSchoolLast) CurrentLast` when the
 * last name changed, otherwise `First “Nick” Last`. Pure: used on client and server.
 */
export function formatDisplayName(p: {
  firstName: string;
  hsLastName: string;
  currentLastName?: string | null;
  nickname?: string | null;
}): string {
  const first = p.firstName.trim();
  const hs = p.hsLastName.trim();
  const current = (p.currentLastName ?? "").trim();
  const nick = (p.nickname ?? "").trim();
  const last = current && current.toLowerCase() !== hs.toLowerCase() ? `(${hs}) ${current}` : hs;
  return `${first}${nick ? ` “${nick}”` : ""} ${last}`;
}

/** Case- and accent-insensitive form for search: "José" → "jose". */
export function foldForSearch(value: string): string {
  return value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
