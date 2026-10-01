import { ButtonLink } from "@/components/ui/Button";
import { PhotoFrame, type School } from "@/components/ui/PhotoFrame";
import { SectionHeading } from "@/components/ui/SectionHeading";

const FRAMES: School[] = ["crown", "jacobs", "crown", "jacobs", "jacobs", "crown", "jacobs", "crown"];

/**
 * Designed empty state until RSVPs exist (Phase 3/6 replaces the frames with
 * the 8 most recent attendee photos and a live count).
 */
export function WhosComingTeaser() {
  return (
    <section aria-labelledby="whos-coming-title" className="container-page py-16 md:py-24">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-6">
          <SectionHeading eyebrow="Who’s coming" title="Be the first name on the list" id="whos-coming-title">
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
        <ul className="grid grid-cols-4 gap-3 sm:gap-5" aria-label="Classmate photos will appear here">
          {FRAMES.map((school, index) => (
            <li key={index} className={index >= 4 ? "max-sm:hidden" : undefined}>
              <PhotoFrame school={school} size="100%" className={index % 2 ? "rotate-[1.5deg]" : "-rotate-[1.5deg]"} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
