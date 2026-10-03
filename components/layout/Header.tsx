"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Monogram77 } from "@/components/brand/Monogram77";
import { ButtonLink } from "@/components/ui/Button";
import type { NavLink } from "./nav";

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header({ links }: { links: readonly NavLink[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close the menu after navigating (adjust state during render, per React docs).
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="container-page flex h-[var(--header-h)] items-center justify-between gap-4">
        <Link
          href="/"
          className="flex min-h-12 items-center gap-3 text-ink no-underline hover:no-underline"
          aria-label="Class of ’77 reunion — home"
        >
          <Monogram77 height={40} />
          <span className="hidden flex-col leading-tight min-[420px]:flex">
            <span className="type-display text-body">Class of ’77</span>
            <span className="text-small text-muted">50-Year Reunion</span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((link) => {
              const current = isCurrent(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={current ? "page" : undefined}
                    className={`relative flex min-h-12 items-center rounded-sm px-4 text-body font-semibold text-ink no-underline after:absolute after:inset-x-4 after:bottom-1.5 after:h-[3px] after:origin-left after:bg-seam-gold after:transition-transform after:duration-[var(--dur-ui)] hover:no-underline hover:after:scale-x-100 ${
                      current ? "after:scale-x-100" : "after:scale-x-0"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink href="/rsvp" variant="primary" className="min-h-12 px-5">
            RSVP
          </ButtonLink>
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex min-h-12 items-center gap-2 rounded-card border-2 border-ink px-4 font-semibold text-ink lg:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <X size={22} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Menu size={22} strokeWidth={1.75} aria-hidden="true" />
            )}
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      <nav
        id={menuId}
        aria-label="Main"
        hidden={!open}
        className="border-t border-line bg-paper-raised lg:hidden"
      >
        <ul className="container-page flex flex-col py-2">
          {links.map((link) => {
            const current = isCurrent(pathname, link.href);
            return (
              <li key={link.href} className="border-b border-line last:border-b-0">
                <Link
                  href={link.href}
                  aria-current={current ? "page" : undefined}
                  className={`flex min-h-14 items-center text-lead font-semibold no-underline hover:no-underline ${
                    current ? "text-crown-blue-deep" : "text-ink"
                  }`}
                >
                  {current ? (
                    <span className="mr-3 h-6 w-1 skew-x-[-28deg] bg-seam-gold" aria-hidden="true" />
                  ) : null}
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
