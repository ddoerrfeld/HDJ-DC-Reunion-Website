import { Markdown } from "@/components/ui/Markdown";
import { getSiteText } from "@/lib/data/settings";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getYearbookCovers } from "@/lib/data/yearbooks";

/**
 * Two books leaning toward each other (SPEC §4.1 seam reuse): the real 1977
 * covers once the yearbooks are set up, an abstract stand-in before that.
 */
function Book({ school, cover }: { school: "crown" | "jacobs"; cover?: string }) {
  const crown = school === "crown";
  if (cover) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- signed CDN image
      <img
        src={cover}
        alt=""
        width={240}
        height={314}
        className={`h-60 w-auto origin-bottom rounded-r-sm shadow-[inset_6px_0_0_rgb(0_0_0/0.18),0_12px_24px_-12px_rgb(30_27_22/0.6)] sm:h-72 ${
          crown ? "rotate-[4deg]" : "-rotate-[4deg]"
        }`}
      />
    );
  }
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

export async function YearbookShelf() {
  // The home page must never fail because of the yearbooks.
  const t = await getSiteText();
  const covers = await getYearbookCovers().catch(() => ({}) as Awaited<ReturnType<typeof getYearbookCovers>>);
  const ready = Boolean(covers.crown && covers.jacobs);
  return (
    <section aria-labelledby="yearbooks-title" className="bg-paper-sunk/60 py-16 md:py-24">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2">
        <div className="flex items-end justify-center gap-10 border-b-8 border-jacobs-brown/80 pb-0">
          <Book school="crown" cover={covers.crown?.display} />
          <Book school="jacobs" cover={covers.jacobs?.display} />
        </div>
        <div className="flex flex-col gap-6">
          <SectionHeading eyebrow="The yearbooks" title={t["home.yearbooks_title"]} id="yearbooks-title">
            <Markdown>{t["home.yearbooks_text"]}</Markdown>
            {ready ? null : <p>The readers open once both books are set up.</p>}
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
