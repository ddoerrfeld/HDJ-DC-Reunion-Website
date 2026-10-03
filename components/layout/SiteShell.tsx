import type { ReactNode } from "react";
import { getFeatureFlags } from "@/lib/data/settings";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { INFO_LINK, MEMORIAM_LINK, NAV_LINKS } from "./nav";

export async function SiteShell({ children }: { children: ReactNode }) {
  // Optional pages (SPEC §2) join the menus when the organizer turns them on.
  const flags = await getFeatureFlags();
  const links = flags.faq ? [...NAV_LINKS, INFO_LINK] : NAV_LINKS;
  const footerLinks = flags.inMemoriam ? [...links, MEMORIAM_LINK] : links;
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="fixed left-4 top-2 z-50 -translate-y-[200%] rounded-card bg-ink px-5 py-3 font-semibold text-white no-underline focus:translate-y-0"
      >
        Skip to main content
      </a>
      <Header links={links} />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer links={footerLinks} />
    </div>
  );
}
