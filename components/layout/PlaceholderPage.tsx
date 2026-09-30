import type { ReactNode } from "react";
import { SeamRule } from "@/components/brand/Seam";
import { ComingSoonCard } from "@/components/ui/ComingSoonCard";

interface PlaceholderPageProps {
  eyebrow: string;
  title: string;
  intro: string;
  cardTitle: string;
  children: ReactNode;
  showEmailNote?: boolean;
}

/** Interim page used until a route's phase is built, so organizers never hit a 404 from the nav. */
export function PlaceholderPage({ eyebrow, title, intro, cardTitle, children, showEmailNote }: PlaceholderPageProps) {
  return (
    <div className="container-page py-16 md:py-24">
      <header className="flex flex-col gap-3">
        <p className="type-eyebrow text-crown-blue-deep">{eyebrow}</p>
        <h1 className="type-display text-h1 text-ink md:text-display">{title}</h1>
        <SeamRule className="w-full max-w-72" />
        <p className="measure text-lead text-ink">{intro}</p>
      </header>
      <div className="mt-10 max-w-3xl">
        <ComingSoonCard title={cardTitle} headingLevel="h2" showEmailNote={showEmailNote}>
          {children}
        </ComingSoonCard>
      </div>
    </div>
  );
}
