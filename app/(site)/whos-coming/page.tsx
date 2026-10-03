import { Markdown } from "@/components/ui/Markdown";
import { getSiteText } from "@/lib/data/settings";
import type { Metadata } from "next";
import { SeamRule } from "@/components/brand/Seam";
import { ClassmateCheck, VERIFY_MESSAGES } from "@/components/classmates/ClassmateCheck";
import { WhosComing } from "@/components/directory/WhosComing";
import { getDirectory } from "@/lib/data/directory";
import { parseFilters } from "@/lib/directory/filters";
import { safeNextPath } from "@/lib/gate";
import { hasYearbookAccess } from "@/lib/yearbook/access";

export const metadata: Metadata = { title: "Who’s Coming", robots: { index: false, follow: false } };
// The classmate gate depends on cookies; counts change with every RSVP.
export const dynamic = "force-dynamic";

export default async function WhosComingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const t = await getSiteText();
  // Same launch-time rule as the yearbooks (SPEC §12.1): the directory shows who will be away from home.
  const access = await hasYearbookAccess();
  const data = access ? await getDirectory({ includeThen: true }) : null;

  return (
    <div className="container-page py-16 md:py-20">
      <header className="flex flex-col gap-3">
        <p className="type-eyebrow text-crown-blue-deep">Who’s coming</p>
        <h1 className="type-display text-h1 text-ink md:text-display">Who’s coming</h1>
        <SeamRule className="w-full max-w-72" />
        <Markdown className="measure text-lead text-ink">{t["whos.intro"]}</Markdown>
      </header>
      <div className="mt-10">
        {data ? (
          <WhosComing data={data} initial={parseFilters(params)} />
        ) : (
          <ClassmateCheck
            error={params.verify ? VERIFY_MESSAGES[params.verify] : undefined}
            next={safeNextPath(params.next ?? "/whos-coming")}
            back="/whos-coming"
            reason="This list shows who will be away from home that weekend, so it’s just for the Class of ’77."
            submitLabel="See who’s coming"
          />
        )}
      </div>
    </div>
  );
}
