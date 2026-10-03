import { Markdown } from "@/components/ui/Markdown";
import { getSiteText } from "@/lib/data/settings";
import type { Metadata } from "next";
import Link from "next/link";
import { DuotoneBand } from "@/components/brand/DuotoneBand";
import { ClassmateCheck, VERIFY_MESSAGES } from "@/components/classmates/ClassmateCheck";
import { SeamRule } from "@/components/brand/Seam";
import { ButtonLink } from "@/components/ui/Button";
import { ComingSoonCard } from "@/components/ui/ComingSoonCard";
import { getYearbookCovers, SCHOOL_NAMES } from "@/lib/data/yearbooks";
import { safeNextPath } from "@/lib/gate";
import { hasYearbookAccess } from "@/lib/yearbook/access";
import type { YearbookSchool } from "@/lib/yearbook/types";

export const metadata: Metadata = {
  title: "Yearbooks",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";


const BOOK_ORDER: YearbookSchool[] = ["crown", "jacobs"];

export default async function YearbooksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const t = await getSiteText();
  const access = await hasYearbookAccess();
  const covers = access ? await getYearbookCovers() : {};
  const ready = BOOK_ORDER.every((s) => covers[s]);

  return (
    <>
    <DuotoneBand />
    <div className="container-page py-12 md:py-16">
      <header className="flex flex-col gap-3">
        <p className="type-eyebrow text-crown-blue-deep">The 1977 yearbooks</p>
        <h1 className="type-display text-h1 text-ink md:text-display">Yearbooks</h1>
        <SeamRule className="w-full max-w-72" />
        <Markdown className="measure text-lead text-ink">{t["yearbooks.intro"]}</Markdown>
      </header>

      {!access ? (
        <ClassmateCheck
          error={params.verify ? VERIFY_MESSAGES[params.verify] : undefined}
          next={safeNextPath(params.next ?? "/yearbooks")}
          back="/yearbooks"
          reason="The yearbooks show every classmate, so they’re just for the Class of ’77."
          submitLabel="Open the yearbooks"
        />
      ) : !ready ? (
        <div className="mt-10 max-w-3xl">
          <ComingSoonCard title="The yearbook readers are being set up" headingLevel="h2" showEmailNote={false}>
            <p>Both books have been scanned and will open here shortly.</p>
          </ComingSoonCard>
        </div>
      ) : (
        <ul className="mt-12 grid gap-12 sm:grid-cols-2 lg:max-w-5xl">
          {BOOK_ORDER.map((school) => (
            <li key={school} className="flex flex-col items-center gap-5 text-center">
              <Link
                href={`/yearbooks/${school}`}
                className={`group block w-56 origin-bottom transition-transform duration-[var(--dur-enter)] ease-[var(--ease-out)] hover:-translate-y-1 sm:w-64 ${
                  school === "crown" ? "rotate-[-2deg]" : "rotate-[2deg]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- signed CDN image */}
                <img
                  src={covers[school]!.display}
                  alt={`Cover of the ${SCHOOL_NAMES[school].short} yearbook`}
                  width={1100}
                  height={1440}
                  className={`aspect-[1100/1440] w-full rounded-r-sm object-cover shadow-[inset_6px_0_0_rgb(0_0_0/0.18),0_18px_36px_-16px_rgb(30_27_22/0.65)] ring-4 ${
                    school === "crown" ? "ring-crown-blue" : "ring-jacobs-brown"
                  }`}
                />
              </Link>
              <div className="flex flex-col items-center gap-3">
                <h2 className="text-h2 text-ink">{SCHOOL_NAMES[school].short}</h2>
                <p className="text-body text-muted">{SCHOOL_NAMES[school].full}</p>
                <ButtonLink href={`/yearbooks/${school}`} variant="secondary">
                  Open the {school === "crown" ? "Crown" : "Jacobs"} yearbook
                </ButtonLink>
              </div>
            </li>
          ))}
        </ul>
      )}

      {access && ready ? (
        <aside className="mt-16 max-w-3xl rounded-card border-2 border-line bg-paper-raised p-6 shadow-card">
          <h2 className="text-h3 text-ink">See yourself in ’77</h2>
          <p className="mt-2 text-body text-ink">
            When you RSVP, you can pick out your own senior portrait. It appears next to your current photo on
            Who’s Coming — then and now.
          </p>
          <div className="mt-4">
            <ButtonLink href="/rsvp">RSVP and find your photo</ButtonLink>
          </div>
        </aside>
      ) : null}
    </div>
    </>
  );
}
