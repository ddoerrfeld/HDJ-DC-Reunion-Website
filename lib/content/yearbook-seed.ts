/**
 * The two 1977 yearbooks as delivered by the owner (private repo
 * ddoerrfeld/crownjacobs77-yearbooks), reviewed on the contact sheets the owner
 * approved on 2026-09-30. `seq` is the 1-based file order. Everything here is an
 * editable starting point: the admin panel owns these values once seeded.
 */
export type YearbookSchool = "jacobs" | "crown";

export interface YearbookBookSeed {
  school: YearbookSchool;
  title: string;
  /** Folder inside the yearbook repo. */
  dir: string;
  /** File-order ranges of the senior portrait pages ("Jump to seniors"). */
  seniorsStartSeq: number;
  seniorsEndSeq: number;
  /** Blank endpapers and autograph pages, hidden from the reader. */
  hiddenSeqs: number[];
}

export const YEARBOOK_BOOKS_SEED: YearbookBookSeed[] = [
  {
    school: "jacobs",
    title: "Eyrie 1977",
    dir: "jacobs-1977",
    seniorsStartSeq: 112,
    seniorsEndSeq: 123,
    hiddenSeqs: [2, 3, 4, 181, 182, 183],
  },
  {
    school: "crown",
    title: "Valhallan 1977",
    dir: "crown-1977",
    seniorsStartSeq: 88,
    seniorsEndSeq: 103,
    hiddenSeqs: [2, 3, 4, 168, 169, 170, 171, 172, 173],
  },
];
