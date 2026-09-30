import type { ReactNode } from "react";
import { SeamRule } from "@/components/brand/Seam";

export function RsvpHeader({ eyebrow = "RSVP", title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3">
      <p className="type-eyebrow text-crown-blue-deep">{eyebrow}</p>
      <h1 className="type-display text-h1 text-ink md:text-display">{title}</h1>
      <SeamRule className="w-full max-w-72" />
      {children ? <div className="measure text-lead text-ink">{children}</div> : null}
    </header>
  );
}
