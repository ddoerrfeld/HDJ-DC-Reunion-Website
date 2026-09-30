/**
 * Geometry for the "77" monogram (SPEC §4.1). Original artwork.
 *
 * Two 7s side by side. Each stem runs at exactly 62° from horizontal — the
 * site-wide seam angle — and the gold seam runs in the slot between them.
 * The Crown 7 carries a Viking-horn flourish on its top bar; the Jacobs 7
 * carries a feathered wing tip. Units: glyph height = 100.
 */

const K = 1 / Math.tan((62 * Math.PI) / 180); // horizontal run per unit of drop
const H = 100; // glyph height
const BAR = 20; // top-bar thickness
const STEM = 22; // stem width, measured horizontally
const SLOT = 7; // gap between the two 7s that holds the seam
const SEAM = 3; // seam width, measured horizontally
const BAR_LEN = 50;

const r = (n: number) => Math.round(n * 100) / 100;
const pts = (list: Array<[number, number]>) => list.map(([x, y]) => `${r(x)},${r(y)}`).join(" ");

function seven(left: number, right: number, barLeftSlanted: boolean): string {
  const barLeftBottom = barLeftSlanted ? left - BAR * K : left;
  return pts([
    [left, 0],
    [right, 0],
    [right - H * K, H],
    [right - STEM - H * K, H],
    [right - STEM - BAR * K, BAR],
    [barLeftBottom, BAR],
  ]);
}

const L0 = 30;
const L1 = L0 + BAR_LEN;
const R0 = L1 + SLOT;
const R1 = R0 + BAR_LEN;
const S0 = L1 + (SLOT - SEAM) / 2;

export const MONOGRAM = {
  viewBox: "0 -20 150 120",
  aspect: 150 / 120,
  crownSeven: seven(L0, L1, false),
  jacobsSeven: seven(R0, R1, true),
  seam: pts([
    [S0, 0],
    [S0 + SEAM, 0],
    [S0 + SEAM - H * K, H],
    [S0 - H * K, H],
  ]),
  /** Viking horn: a tapered crescent rising from the Crown 7's top-left corner. */
  horn: `M ${L0} 0 C ${L0 - 3} -6 ${L0 - 5} -12 ${L0 - 3} -18 C ${L0 + 2} -10 ${L0 + 9} -4 ${L0 + 17} 0 Z`,
  /** Wing: a swept tip with feather notches off the Jacobs 7's top-right corner. */
  wing: `M ${R1 - 17} 0 C ${R1 - 10} -5 ${R1 - 2} -11 ${R1 + 6} -18 L ${R1 + 4} -12.5 L ${R1 + 9} -13 L ${R1 + 5} -7.5 L ${R1 + 10} -7.5 L ${R1 + 3} -1.5 L ${R1} 0 Z`,
} as const;
