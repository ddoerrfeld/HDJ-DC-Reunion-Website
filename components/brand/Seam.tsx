/**
 * Seam treatments (SPEC §4.1). The seam is always gold and always 62°.
 *
 *  - SeamRule: section divider for light surfaces — a Crown-blue rule, a gold
 *    62° slash, a Jacobs-brown rule.
 *  - SeamBand: a solid split band (blue | gold seam | brown) for edges of
 *    dark sections and the tops of placeholder cards.
 */

export function SeamRule({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-0 ${className}`} aria-hidden="true">
      <span className="h-0.5 flex-1 bg-crown-blue" />
      <svg viewBox="0 0 24 30" className="mx-1 h-7 w-6 shrink-0">
        {/* 62°: over a 30-unit rise the slash runs 30 / tan 62° ≈ 15.95 units. */}
        <polygon points="16,0 22,0 6.05,30 0.05,30" fill="var(--seam-gold)" />
      </svg>
      <span className="h-0.5 flex-1 bg-jacobs-brown" />
    </div>
  );
}

export function SeamBand({ className = "", height = 8 }: { className?: string; height?: number }) {
  return <div className={`split-surface w-full ${className}`} style={{ height }} aria-hidden="true" />;
}
