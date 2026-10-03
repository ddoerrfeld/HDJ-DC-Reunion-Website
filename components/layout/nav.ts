export interface NavLink {
  href: string;
  label: string;
}

/** Global nav (SPEC §5). RSVP is rendered separately as the primary button. Info joins when its flag is on. */
export const NAV_LINKS: readonly NavLink[] = [
  { href: "/weekend", label: "Weekend" },
  { href: "/stay", label: "Stay" },
  { href: "/whos-coming", label: "Who’s Coming" },
  { href: "/yearbooks", label: "Yearbooks" },
];

export const INFO_LINK: NavLink = { href: "/info", label: "Info" };
export const MEMORIAM_LINK: NavLink = { href: "/in-memoriam", label: "In Memoriam" };
