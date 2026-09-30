import { ComingSoonCard } from "@/components/ui/ComingSoonCard";

/**
 * Online payment was removed by the owner (no payment processor). Anywhere a
 * paid event is chosen, this designed placeholder explains what happens next.
 */
export function PaymentComingSoon({ titles, headingLevel = "h3" }: { titles: string[]; headingLevel?: "h2" | "h3" }) {
  if (titles.length === 0) return null;
  const list = titles.length === 1 ? titles[0] : `${titles.slice(0, -1).join(", ")} and ${titles[titles.length - 1]}`;
  return (
    <ComingSoonCard title="How to pay" eyebrow="Payment details coming soon" headingLevel={headingLevel}>
      <p>
        Your spot is saved — there’s nothing to pay on this website. The organizers will share how to pay
        for {list}.
      </p>
    </ComingSoonCard>
  );
}
