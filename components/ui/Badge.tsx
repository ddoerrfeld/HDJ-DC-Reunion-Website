import type { ReactNode } from "react";

export type BadgeTone = "crown" | "jacobs" | "neutral" | "pending" | "paid";

const tones: Record<BadgeTone, string> = {
  crown: "bg-crown-blue text-white border-crown-blue",
  jacobs: "bg-jacobs-brown text-jacobs-gold border-jacobs-brown", // gold on brown 6.79:1
  neutral: "bg-paper-sunk text-ink border-line",
  pending: "bg-paper-raised text-muted border-line-strong border-dashed",
  paid: "bg-jacobs-gold text-jacobs-brown border-jacobs-brown",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-0.5 text-small font-semibold leading-snug ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Tag for items where confirmed = false (SPEC §6); the item's own note replaces the generic text. */
export function ToBeConfirmed({ note }: { note?: string | null }) {
  return <Badge tone="pending">{note || "To be confirmed"}</Badge>;
}
