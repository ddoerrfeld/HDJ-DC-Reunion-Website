import { ExternalLink, LogOut } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { getAdmin } from "@/lib/admin/auth";
import { signOut } from "./login/actions";

export const metadata: Metadata = {
  title: { default: "Organizer", template: "%s · Organizer · Class of ’77" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getAdmin();
  return (
    <div className="flex min-h-svh flex-col bg-paper">
      <a href="#main" className="fixed top-2 left-4 z-50 -translate-y-[200%] rounded-card bg-ink px-5 py-3 font-semibold text-white no-underline focus:translate-y-0">
        Skip to main content
      </a>
      <header className="bg-ink text-white">
        <div className="container-page flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
          <Link href="/admin" className="flex min-h-12 items-center gap-3 text-white no-underline">
            <span className="font-display text-lead tracking-wide">Class of ’77</span>
            <span className="text-body font-semibold text-white/85">Organizer</span>
          </Link>
          <div className="flex flex-wrap items-center gap-x-5">
            <Link href="/" className="inline-flex min-h-12 items-center gap-2 font-semibold text-white underline">
              View the site
              <ExternalLink size={18} strokeWidth={1.75} aria-hidden="true" />
            </Link>
            {admin ? (
              <form action={signOut}>
                <button type="submit" className="inline-flex min-h-12 items-center gap-2 font-semibold text-white underline">
                  <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
        </div>
        <div className="h-1 split-surface" aria-hidden="true" />
      </header>
      {admin ? <AdminNav /> : null}
      <main id="main" tabIndex={-1} className="container-page flex-1 py-8 focus:outline-none md:py-10">
        {children}
      </main>
      {admin ? (
        <footer className="container-page border-t border-line py-6 text-small text-muted">Signed in as {admin}</footer>
      ) : null}
    </div>
  );
}
