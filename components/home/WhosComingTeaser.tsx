import { ButtonLink } from "@/components/ui/Button";
import { PhotoFrame, type School } from "@/components/ui/PhotoFrame";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getDirectory } from "@/lib/data/directory";

const FRAMES: School[] = ["crown", "jacobs", "crown", "jacobs", "jacobs", "crown", "jacobs", "crown"];

/**
 * Live count and the 8 most recent attendee photos (SPEC §5); frames keep the
 * designed placeholder until enough classmates have added a photo.
 */
export async function WhosComingTeaser() {
  // SPEC §5: live count + the 8 most recent photos. Photos only — no names on the public home page.
  const directory = await getDirectory({ includeThen: false }).catch(() => null);
  const count = (directory?.people.length ?? 0) + (directory?.unlisted ?? 0);
  const recent = (directory?.people ?? [])
    .filter((p) => p.photoSmall)
    .sort((a, b) => a.recentRank - b.recentRank)
    .slice(0, 8);
  const frames = FRAMES.map((school, index) => ({ school: recent[index]?.school ?? school, photo: recent[index]?.photo ?? null }));
  return (
    <section aria-labelledby="whos-coming-title" className="container-page py-16 md:py-24">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-6">
          <SectionHeading
            eyebrow="Who’s coming"
            title={count > 0 ? `${count} ${count === 1 ? "classmate is" : "classmates are"} coming` : "Be the first name on the list"}
            id="whos-coming-title"
          >
            <p>
              As classmates RSVP, their photos fill this space — Crown grads in blue, Jacobs grads in
              gold. RSVPs are open — add yours.
            </p>
          </SectionHeading>
          <div>
            <ButtonLink href="/whos-coming" variant="secondary">
              Who’s coming
            </ButtonLink>
          </div>
        </div>
        <ul className="grid grid-cols-4 gap-3 sm:gap-5" aria-label={recent.length ? "Recent classmates’ photos" : "Classmate photos will appear here"}>
          {frames.map(({ school, photo }, index) => (
            <li key={index} className={index >= 4 ? "max-sm:hidden" : undefined}>
              <PhotoFrame school={school} size="100%" className={index % 2 ? "rotate-[1.5deg]" : "-rotate-[1.5deg]"}>
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- pre-sized storage image
                  <img src={photo} alt="" width={512} height={512} loading="lazy" className="absolute inset-0 size-full object-cover" />
                ) : undefined}
              </PhotoFrame>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
