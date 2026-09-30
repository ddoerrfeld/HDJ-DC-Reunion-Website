import { ArrowLeftRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { YearbookReader } from "@/components/yearbook/YearbookReader";
import { ComingSoonCard } from "@/components/ui/ComingSoonCard";
import { getFeatureFlags } from "@/lib/data/settings";
import { getYearbook, isYearbookSchool, SCHOOL_NAMES } from "@/lib/data/yearbooks";
import { hasYearbookAccess } from "@/lib/yearbook/access";

// Signed image URLs and the section gate depend on the request.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ school: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { school } = await params;
  if (!isYearbookSchool(school)) return {};
  return { title: `${SCHOOL_NAMES[school].short} yearbook`, robots: { index: false, follow: false } };
}

export default async function YearbookPage({ params, searchParams }: Props) {
  const { school } = await params;
  if (!isYearbookSchool(school)) notFound();
  const query = await searchParams;
  const page = Number.parseInt(query.page ?? "1", 10);

  if (!(await hasYearbookAccess())) {
    const next = `/yearbooks/${school}${Number.isFinite(page) && page > 1 ? `?page=${page}` : ""}`;
    redirect(`/yearbooks?next=${encodeURIComponent(next)}`);
  }

  const [book, flags] = await Promise.all([getYearbook(school), getFeatureFlags()]);
  const other = school === "crown" ? "jacobs" : "crown";

  if (!book) {
    return (
      <div className="container-page py-16 md:py-24">
        <h1 className="type-display text-h1 text-ink">{SCHOOL_NAMES[school].short} yearbook</h1>
        <div className="mt-10 max-w-3xl">
          <ComingSoonCard title="This yearbook is being set up" headingLevel="h2" showEmailNote={false}>
            <p>The pages have been scanned and will appear here shortly.</p>
          </ComingSoonCard>
        </div>
      </div>
    );
  }

  return (
    <YearbookReader
      book={book}
      initialPage={Number.isFinite(page) ? page : 1}
      searchEnabled={flags.yearbookOcr}
      header={
        <div className="flex items-center justify-between gap-x-4 border-b border-line bg-paper px-4 py-2">
          <h1 className="text-lead text-ink sm:text-h3">
            <span className={school === "crown" ? "text-crown-blue-deep" : "text-jacobs-brown"}>{book.shortName}</span>{" "}
            <span className="hidden font-sans text-body font-normal text-muted md:inline">
              <cite className="not-italic">{book.title}</cite> · {book.schoolName}
            </span>
          </h1>
          <Link href={`/yearbooks/${other}`} className="inline-flex min-h-12 shrink-0 items-center gap-2 font-semibold text-crown-blue-deep underline">
            <ArrowLeftRight size={20} strokeWidth={1.75} aria-hidden="true" />
            <span>
              Switch to <span className="hidden sm:inline">the </span>
              {SCHOOL_NAMES[other].short}
              <span className="hidden sm:inline"> yearbook</span>
            </span>
          </Link>
        </div>
      }
    />
  );
}
