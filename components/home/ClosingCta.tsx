import { Monogram77 } from "@/components/brand/Monogram77";
import { ButtonLink } from "@/components/ui/Button";

export function ClosingCta() {
  return (
    <section aria-labelledby="closing-title" className="split-surface halftone relative text-white">
      <div className="container-page flex flex-col items-center gap-6 py-20 text-center md:py-28">
        <Monogram77 variant="dark" height={88} />
        <h2 id="closing-title" className="max-w-[20ch] text-h2 text-white md:text-h1 [text-shadow:var(--seam-halo)]">
          Save your spot for October 2027
        </h2>
        <p className="measure text-lead text-white [text-shadow:var(--seam-halo)]">
          RSVP once, choose your events, and get a private link to change your plans any time.
        </p>
        <ButtonLink href="/rsvp" variant="primary">
          RSVP
        </ButtonLink>
      </div>
    </section>
  );
}
