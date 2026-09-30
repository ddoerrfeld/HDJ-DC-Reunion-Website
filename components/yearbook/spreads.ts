/**
 * Book layout: the front cover sits alone on the right, inside pages pair up
 * left/right, and the back cover sits alone on the left — like a real book.
 * Everything works in 0-based page indexes; a spread is [left, right] with
 * null for an empty side.
 */
export type Spread = [number | null, number | null];

export function buildSpreads(pageCount: number): Spread[] {
  if (pageCount === 0) return [];
  if (pageCount === 1) return [[null, 0]];
  const last = pageCount - 1;
  const spreads: Spread[] = [[null, 0]];
  for (let i = 1; i < last; i += 2) spreads.push([i, i + 1 < last ? i + 1 : null]);
  spreads.push([last, null]);
  return spreads;
}

export function spreadIndexOf(spreads: Spread[], page: number): number {
  const found = spreads.findIndex(([l, r]) => l === page || r === page);
  return found < 0 ? 0 : found;
}

/** The page a spread "is" for URLs, the page counter and the rail highlight: its left page, else its right. */
export function primaryPage([left, right]: Spread): number {
  return (left ?? right) as number;
}
