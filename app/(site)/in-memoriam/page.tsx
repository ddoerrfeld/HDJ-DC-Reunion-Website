import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeamRule } from "@/components/brand/Seam";
import { ComingSoonCard } from "@/components/ui/ComingSoonCard";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { getMemoriam } from "@/lib/data/memoriam";
import { getFeatureFlags } from "@/lib/data/settings";

export const metadata: Metadata = { title: "In Memoriam" };
export const revalidate = 60;

const SCHOOL = { crown: "Crown ’77", jacobs: "Jacobs ’77", other: "Class of ’77" } as const;

/** SPEC §2/§11: classmates we've lost. Admin-entered only, no public submissions. Quiet by design: no motion, no color blocks. */
export default async function InMemoriamPage() {
  if (!(await getFeatureFlags()).inMemoriam) notFound();
  const people = await getMemoriam();
  return (
    <div className="container-page py-16 md:py-20">
      <header className="flex flex-col gap-3">
        <p className="type-eyebrow text-crown-blue-deep">Remembering</p>
        <h1 className="type-display text-h1 text-ink md:text-display">In Memoriam</h1>
        <SeamRule className="w-full max-w-72" />
        <p className="measure text-lead text-ink">Classmates we’ve lost, and remember fondly.</p>
      </header>
      {people.length === 0 ? (
        <div className="mt-10 max-w-2xl">
          <ComingSoonCard title="In Memoriam" />
        </div>
      ) : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {people.map((m) => (
            <li key={m.id} className="card flex flex-col items-center gap-4 p-6 text-center">
              <PhotoFrame school={m.school} size="10rem">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin photo, pre-sized
                  <img src={m.photoUrl} alt={m.name} width={480} height={600} loading="lazy" className="absolute inset-0 size-full object-cover object-top grayscale-[35%]" />
                ) : undefined}
              </PhotoFrame>
              <div className="flex flex-col gap-1">
                <h2 className="text-h3 text-ink">{m.name}</h2>
                <p className="text-body text-muted">
                  {SCHOOL[m.school]}
                  {m.years ? ` · ${m.years}` : ""}
                </p>
              </div>
              {m.note ? <p className="text-body text-ink">{m.note}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
