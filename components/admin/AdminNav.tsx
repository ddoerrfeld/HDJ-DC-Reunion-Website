"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/rsvps", label: "RSVPs" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/content", label: "Site text" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/exports", label: "Exports" },
  { href: "/admin/classmates", label: "Classmates" },
  { href: "/admin/yearbooks", label: "Yearbooks" },
  { href: "/admin/stay", label: "Stay" },
  { href: "/admin/memoriam", label: "In Memoriam" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export function AdminNav() {
  const path = usePathname();
  const current = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`));
  return (
    <nav aria-label="Organizer" className="border-b-2 border-line bg-paper-raised">
      <ul className="container-page flex flex-wrap gap-x-1 py-1">
        {ADMIN_NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={current(item.href) ? "page" : undefined}
              className="inline-flex min-h-12 items-center rounded-sm px-3 font-semibold text-ink no-underline hover:bg-paper-sunk aria-[current=page]:bg-ink aria-[current=page]:text-white"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
