import { ComingSoonCard } from "@/components/ui/ComingSoonCard";
import type { Lodging } from "@/lib/data/lodging";
import { LodgingCard, LodgingFeature } from "./LodgingCard";

/** The body of /stay for any number of lodging rows (SPEC §6.1). */
export function StayContent({ lodging }: { lodging: Lodging[] }) {
  if (lodging.length === 0) {
    return (
      <ComingSoonCard title="A hotel room block is being arranged" headingLevel="h2">
        <p>Check back soon.</p>
      </ComingSoonCard>
    );
  }

  const official = lodging.filter((l) => l.isOfficialBlock);
  const others = lodging.filter((l) => !l.isOfficialBlock);

  return (
    <div className="flex flex-col gap-12">
      {official.map((l) => (
        <LodgingFeature key={l.id} lodging={l} />
      ))}
      {others.length > 0 ? (
        <section aria-labelledby="stay-others-title" className="flex flex-col gap-6">
          <h2 id="stay-others-title" className="text-h2 text-ink">
            {official.length > 0 ? "Other places nearby" : "Places to stay nearby"}
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {others.map((l) => (
              <LodgingCard key={l.id} lodging={l} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
