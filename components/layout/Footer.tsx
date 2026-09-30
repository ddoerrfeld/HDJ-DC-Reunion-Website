import Link from "next/link";
import { Monogram77 } from "@/components/brand/Monogram77";
import { SeamBand } from "@/components/brand/Seam";
import { getPublicSettings } from "@/lib/data/settings";
import { NAV_LINKS } from "./nav";

export async function Footer() {
  const { organizerContactEmail } = await getPublicSettings();
  return (
    <footer className="mt-auto bg-ink text-paper">
      <SeamBand height={8} />
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Monogram77 variant="dark" height={56} />
            <div>
              <p className="type-display text-lead text-white">Class of ’77</p>
              <p className="text-small text-paper">50-Year Reunion · October 8–10, 2027</p>
            </div>
          </div>
          <p className="measure text-body text-paper">
            Irving Crown High School and Harry D. Jacobs High School — one class, together again.
          </p>
          {/* Organizer contact email is an admin setting (SPEC §11). */}
          {organizerContactEmail ? (
            <p className="text-body text-paper">
              Questions? Email the organizers at{" "}
              <a href={`mailto:${organizerContactEmail}`} className="text-white">
                {organizerContactEmail}
              </a>
            </p>
          ) : (
            <p className="text-small text-paper">Organizer contact details are coming soon.</p>
          )}
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-6">
            {[...NAV_LINKS, { href: "/rsvp", label: "RSVP" }].map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="flex min-h-12 items-center text-body text-paper">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/15">
        <p className="container-page py-6 text-small text-paper">Built for the Class of ’77.</p>
      </div>
    </footer>
  );
}
