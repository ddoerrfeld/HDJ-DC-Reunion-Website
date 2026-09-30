export interface NavLink {
  href: string;
  label: string;
}

/** Global nav (SPEC §5). RSVP is rendered separately as the primary button. Info joins when its flag is on (Phase 7). */
export const NAV_LINKS: readonly NavLink[] = [
  { href: "/weekend", label: "Weekend" },
  { href: "/stay", label: "Stay" },
  { href: "/whos-coming", label: "Who’s Coming" },
  { href: "/yearbooks", label: "Yearbooks" },
];
