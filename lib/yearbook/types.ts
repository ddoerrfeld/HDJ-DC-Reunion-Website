export type YearbookSchool = "crown" | "jacobs";

/** One visible page as the reader sees it. URLs are signed and expire (lib/yearbook/sign.ts). */
export interface ReaderPage {
  id: string;
  /** File order in the original scans (stable id for the organizer). */
  seq: number;
  /** 1-based position among visible pages: what "Go to page" and ?page=N use. */
  number: number;
  label: string;
  width: number;
  height: number;
  thumb: string;
  display: string;
  displayJpg: string;
  zoom: string;
}

export interface ReaderBook {
  school: YearbookSchool;
  title: string;
  shortName: string;
  schoolName: string;
  /** Page numbers (not file seq) of the senior portraits, for "Jump to seniors". */
  seniorsStart: number | null;
  seniorsEnd: number | null;
  pages: ReaderPage[];
}
