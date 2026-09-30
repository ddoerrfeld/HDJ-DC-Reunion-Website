/**
 * SPEC §6 seed data — the ONLY source of event facts until Phase 2 moves this
 * into the `event_items` table (this file then becomes the seed script's input).
 * Field names mirror SPEC §16. Do not add facts that are not in SPEC §6.
 *
 * Times are America/Chicago; October 2027 is CDT (UTC−05:00).
 */

export type ChoiceGroup = "fri_tour" | "fri_game" | "sat_day";

export interface EventItem {
  slug: string;
  /** Calendar day in America/Chicago, YYYY-MM-DD. */
  day: string;
  startsAt: string | null;
  endsAt: string | null;
  title: string;
  descriptionMd: string;
  locationName: string | null;
  address: string | null;
  addressConfirmed: boolean;
  choiceGroup: ChoiceGroup | null;
  requiresPayment: boolean;
  priceCents: number | null;
  allowsGuests: boolean;
  capacity: number | null;
  confirmed: boolean;
  halftimeEligible: boolean;
  visible: boolean;
  sort: number;
}

const JACOBS_ADDRESS = "2601 Bunker Hill Dr, Algonquin, IL 60102";
const CROWN_ADDRESS = "1500 Kings Rd, Carpentersville, IL 60110";

export const EVENT_ITEMS_SEED: readonly EventItem[] = [
  {
    slug: "fri-tour-jacobs",
    day: "2027-10-08",
    startsAt: "2027-10-08T15:30:00-05:00",
    endsAt: "2027-10-08T16:30:00-05:00",
    title: "School Tour — Jacobs",
    descriptionMd: "Walk the halls where the first Jacobs class finished.",
    locationName: "Harry D. Jacobs High School",
    address: JACOBS_ADDRESS,
    addressConfirmed: true,
    choiceGroup: "fri_tour",
    requiresPayment: false,
    priceCents: null,
    allowsGuests: true,
    capacity: null,
    confirmed: true,
    halftimeEligible: false,
    visible: true,
    sort: 10,
  },
  {
    slug: "fri-tour-crown",
    day: "2027-10-08",
    startsAt: "2027-10-08T15:30:00-05:00",
    endsAt: "2027-10-08T16:30:00-05:00",
    title: "School Tour — Crown",
    descriptionMd: "Walk the halls where it all started.",
    locationName: "Irving Crown building (today Dundee-Crown High School)",
    address: CROWN_ADDRESS,
    addressConfirmed: true,
    choiceGroup: "fri_tour",
    requiresPayment: false,
    priceCents: null,
    allowsGuests: true,
    capacity: null,
    confirmed: true,
    halftimeEligible: false,
    visible: true,
    sort: 20,
  },
  {
    slug: "fri-pregame",
    day: "2027-10-08",
    startsAt: "2027-10-08T17:00:00-05:00",
    endsAt: null,
    title: "Pre-Game Drink",
    descriptionMd:
      "Pay your own tab. The brewery has no kitchen on site — food trucks or outside food only.",
    locationName: "Scorched Earth Brewing Co.",
    address: "203 Berg St, Algonquin, IL 60102",
    addressConfirmed: true,
    choiceGroup: null,
    requiresPayment: false,
    priceCents: null,
    allowsGuests: true,
    capacity: null,
    confirmed: true,
    halftimeEligible: false,
    visible: true,
    sort: 30,
  },
  {
    slug: "fri-game-jacobs",
    day: "2027-10-08",
    startsAt: "2027-10-08T19:00:00-05:00",
    endsAt: null,
    title: "Football: Jacobs vs. Prairie Ridge",
    descriptionMd: "Halftime recognition of the Class of ’77.",
    locationName: "Jacobs High School",
    address: JACOBS_ADDRESS,
    addressConfirmed: true,
    choiceGroup: "fri_game",
    requiresPayment: false,
    priceCents: null,
    allowsGuests: true,
    capacity: null,
    confirmed: false, // 2027 football schedule not yet confirmed by the schools
    halftimeEligible: true,
    visible: true,
    sort: 40,
  },
  {
    slug: "fri-game-crown",
    day: "2027-10-08",
    startsAt: "2027-10-08T19:00:00-05:00",
    endsAt: null,
    title: "Football: Dundee-Crown vs. Crystal Lake South",
    descriptionMd: "Halftime recognition of the Class of ’77.",
    locationName: "Dundee-Crown High School",
    address: CROWN_ADDRESS,
    addressConfirmed: true,
    choiceGroup: "fri_game",
    requiresPayment: false,
    priceCents: null,
    allowsGuests: true,
    capacity: null,
    confirmed: false,
    halftimeEligible: true,
    visible: true,
    sort: 50,
  },
  {
    slug: "sat-golf",
    day: "2027-10-09",
    startsAt: "2027-10-09T11:00:00-05:00",
    endsAt: "2027-10-09T15:00:00-05:00",
    title: "Golf",
    descriptionMd: "",
    locationName: "Randall Oaks Golf Club",
    address: "4101 Binnie Rd, West Dundee, IL 60118",
    addressConfirmed: true,
    choiceGroup: "sat_day",
    requiresPayment: false, // TBD by organizer
    priceCents: null,
    allowsGuests: true,
    capacity: null,
    confirmed: true,
    halftimeEligible: false,
    visible: true,
    sort: 60,
  },
  {
    slug: "sat-pickleball",
    day: "2027-10-09",
    startsAt: "2027-10-09T11:00:00-05:00",
    endsAt: "2027-10-09T15:00:00-05:00",
    title: "Pickleball & Social",
    descriptionMd: "",
    locationName: "Pickle Haüs",
    address: "1621 S Randall Rd, Algonquin, IL 60102",
    addressConfirmed: true,
    choiceGroup: "sat_day",
    requiresPayment: false, // TBD by organizer
    priceCents: null,
    allowsGuests: true,
    capacity: null,
    confirmed: true,
    halftimeEligible: false,
    visible: true,
    sort: 70,
  },
  {
    slug: "sat-dinner",
    day: "2027-10-09",
    startsAt: "2027-10-09T18:30:00-05:00",
    endsAt: "2027-10-09T22:30:00-05:00",
    title: "Reunion Dinner",
    descriptionMd: "Cash bar.",
    locationName: "West Dundee VFW Post 2298",
    address: "117 S 1st St, West Dundee, IL 60118",
    addressConfirmed: false,
    choiceGroup: null,
    requiresPayment: true,
    priceCents: null, // price TBD
    allowsGuests: true,
    capacity: null,
    confirmed: false, // venue identity pending organizer confirmation
    halftimeEligible: false,
    visible: true,
    sort: 80,
  },
  {
    slug: "sun-brunch",
    day: "2027-10-10",
    startsAt: null,
    endsAt: null,
    title: "Farewell Breakfast/Brunch",
    descriptionMd: "",
    locationName: null,
    address: null,
    addressConfirmed: false,
    choiceGroup: null,
    requiresPayment: false,
    priceCents: null,
    allowsGuests: true,
    capacity: null,
    confirmed: false,
    halftimeEligible: false,
    visible: true,
    sort: 90,
  },
];
