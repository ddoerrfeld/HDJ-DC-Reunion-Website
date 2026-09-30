import type { Person, Selection } from "./schema";

/**
 * Serializable shapes passed from the server page to the client form.
 * Dates/prices are pre-formatted on the server (no client/server Intl mismatch).
 */
export interface FormItem {
  slug: string;
  day: string;
  dayLabel: string;
  title: string;
  timeLabel: string | null;
  locationName: string | null;
  choiceGroup: string | null;
  requiresPayment: boolean;
  priceLabel: string | null;
  allowsGuests: boolean;
  halftimeEligible: boolean;
  confirmed: boolean;
  unconfirmedNote: string | null;
  full: boolean;
}

export interface SelectionState {
  selected: boolean;
  guests: number;
  halftime: boolean;
  guestNames: Array<{ first: string; last: string }>;
}

export interface PhotoState {
  path: string;
  url: string;
}

export interface FormState {
  person: Omit<Person, "gradSchool"> & { gradSchool: Person["gradSchool"] | "" };
  photo: PhotoState | null;
  selections: Record<string, SelectionState>;
  showInDirectory: boolean;
}

export const EMPTY_PERSON: FormState["person"] = {
  firstName: "",
  hsLastName: "",
  nameChanged: false,
  currentLastName: "",
  nickname: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  gradSchool: "",
};

export function emptySelection(): SelectionState {
  return { selected: false, guests: 0, halftime: false, guestNames: [] };
}

export function selectedList(state: FormState): Selection[] {
  return Object.entries(state.selections)
    .filter(([, s]) => s.selected)
    .map(([slug, s]) => ({
      slug,
      guests: s.guests,
      halftime: s.halftime,
      guestNames: s.guestNames.slice(0, s.guests).map((g) => ({ first: g.first.trim(), last: g.last.trim() })),
    }));
}
export const DRAFT_KEY = "c77-rsvp-draft";
