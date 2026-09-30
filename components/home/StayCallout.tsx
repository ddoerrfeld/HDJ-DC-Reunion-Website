import { BedDouble } from "lucide-react";
import { CutoffChip } from "@/components/stay/LodgingCard";
import { ButtonLink } from "@/components/ui/Button";
import { getLodging } from "@/lib/data/lodging";

/** Compact "Where to stay" callout, shown only once an official room block exists (SPEC §6.1). */
export async function StayCallout() {
  const block = (await getLodging()).find((l) => l.isOfficialBlock);
  if (!block) return null;
  return (
    <section aria-labelledby="home-stay-title" className="container-page pt-4 pb-16">
      <div className="card flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="flex items-start gap-4">
          <BedDouble size={36} strokeWidth={1.75} className="shrink-0 text-crown-blue-deep" aria-hidden="true" />
          <div className="flex flex-col gap-2">
            <p className="type-eyebrow text-crown-blue-deep">Where to stay</p>
            <h2 id="home-stay-title" className="text-h3 text-ink">
              {block.name}
            </h2>
            {block.rateText ? <p className="text-body text-ink">{block.rateText}</p> : null}
            {block.cutoffDate ? <CutoffChip cutoffDate={block.cutoffDate} /> : null}
          </div>
        </div>
        <ButtonLink href="/stay" variant="secondary">
          Hotel details
        </ButtonLink>
      </div>
    </section>
  );
}
