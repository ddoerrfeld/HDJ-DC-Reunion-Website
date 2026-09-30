import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Two books leaning toward each other (SPEC §4.1 seam reuse). Abstract covers
 * only — not facsimiles of the real yearbooks, which arrive in Phase 5.
 */
function Book({ school }: { school: "crown" | "jacobs" }) {
  const crown = school === "crown";
  return (
    <div
      className={`relative flex h-60 w-36 origin-bottom flex-col items-center justify-between rounded-r-sm rounded-l-[2px] py-6 shadow-[inset_6px_0_0_rgb(0_0_0/0.18),0_12px_24px_-12px_rgb(30_27_22/0.6)] sm:h-72 sm:w-44 ${
        crown ? "rotate-[4deg] bg-crown-blue text-white" : "-rotate-[4deg] bg-jacobs-brown text-jacobs-gold"
      } halftone`}
      aria-hidden="true"
    >
      <span className="type-eyebrow">{crown ? "Irving Crown" : "Harry D. Jacobs"}</span>
      <span className="type-display text-display leading-none">’77</span>
      <span className={`h-1 w-16 ${crown ? "bg-white" : "bg-jacobs-gold"}`} />
    </div>
  );
}

export function YearbookShelf() {
  return (
    <section aria-labelledby="yearbooks-title" className="bg-paper-sunk/60 py-16 md:py-24">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2">
        <div className="flex items-end justify-center gap-10 border-b-8 border-jacobs-brown/80 pb-0">
          <Book school="crown" />
          <Book school="jacobs" />
        </div>
        <div className="flex flex-col gap-6">
          <SectionHeading eyebrow="The yearbooks" title="Both 1977 yearbooks, page by page" id="yearbooks-title">
            <p>
              Leaf through the Crown and Jacobs yearbooks, zoom in on every senior portrait, and link
              your own ’77 photo to your RSVP. The readers open once both books are scanned.
            </p>
          </SectionHeading>
          <div>
            <ButtonLink href="/yearbooks" variant="secondary">
              Visit the yearbooks
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
