import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="fixed left-4 top-2 z-50 -translate-y-[200%] rounded-card bg-ink px-5 py-3 font-semibold text-white no-underline focus:translate-y-0"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer />
    </div>
  );
}
