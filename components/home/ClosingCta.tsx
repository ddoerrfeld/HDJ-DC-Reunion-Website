import { Markdown } from "@/components/ui/Markdown";
import { getSiteText } from "@/lib/data/settings";
import { Monogram77 } from "@/components/brand/Monogram77";
import { ButtonLink } from "@/components/ui/Button";

export async function ClosingCta() {
  const t = await getSiteText();
  return (
    <section aria-labelledby="closing-title" className="split-surface halftone relative text-white">
      <div className="container-page flex flex-col items-center gap-6 py-20 text-center md:py-28">
        <Monogram77 variant="dark" height={88} />
        <h2 id="closing-title" className="max-w-[20ch] text-h2 text-white md:text-h1 [text-shadow:var(--seam-halo)]">
          {t["home.closing_title"]}
        </h2>
        <Markdown className="measure text-lead text-white [text-shadow:var(--seam-halo)] [&_a]:text-white">{t["home.closing_text"]}</Markdown>
        <ButtonLink href="/rsvp" variant="primary">
          RSVP
        </ButtonLink>
      </div>
    </section>
  );
}
