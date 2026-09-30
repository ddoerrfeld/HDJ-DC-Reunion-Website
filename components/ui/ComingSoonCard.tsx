import { Clock3 } from "lucide-react";
import type { ReactNode } from "react";
import { SeamBand } from "@/components/brand/Seam";

interface ComingSoonCardProps {
  title: string;
  children?: ReactNode;
  /** Label above the title. */
  eyebrow?: string;
  /** Show the standard "RSVP’d classmates will be emailed" line (SPEC §4.7). */
  showEmailNote?: boolean;
  headingLevel?: "h2" | "h3";
  /** Narrow contexts (inside another card): no icon, tighter padding. */
  compact?: boolean;
  className?: string;
}

/**
 * The designed placeholder for TBD content. Expected to stay in place for
 * months, so it must look intentional and finished (SPEC §0.1, §4.7).
 */
export function ComingSoonCard({
  title,
  children,
  eyebrow = "Details coming soon",
  showEmailNote = true,
  headingLevel: Heading = "h3",
  compact = false,
  className = "",
}: ComingSoonCardProps) {
  return (
    <div className={`card overflow-hidden ${className}`}>
      <SeamBand height={6} />
      <div className={`flex gap-4 ${compact ? "p-5" : "p-6 md:p-8"}`}>
        {compact ? null : (
          <span
            className="mt-1 flex size-12 shrink-0 items-center justify-center rounded-pill border-2 border-dashed border-line-strong text-muted"
            aria-hidden="true"
          >
            <Clock3 size={24} strokeWidth={1.75} />
          </span>
        )}
        <div className="min-w-0">
          <p className="type-eyebrow text-crown-blue-deep">{eyebrow}</p>
          <Heading className={`mt-1 text-ink [overflow-wrap:anywhere] ${compact ? "text-lead" : "text-h3"}`}>
            {title}
          </Heading>
          {children ? <div className="measure mt-2 text-body text-ink">{children}</div> : null}
          {showEmailNote ? (
            <p className="mt-3 text-small text-muted">RSVP’d classmates will be emailed when this is set.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
