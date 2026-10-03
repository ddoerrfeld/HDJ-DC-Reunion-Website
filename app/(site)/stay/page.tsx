import { Markdown } from "@/components/ui/Markdown";
import { getSiteText } from "@/lib/data/settings";
import type { Metadata } from "next";
import { SeamRule } from "@/components/brand/Seam";
import { StayContent } from "@/components/stay/StayContent";
import { getLodging } from "@/lib/data/lodging";

export const metadata: Metadata = { title: "Where to Stay" };

export const revalidate = 60;

export default async function StayPage() {
  const [lodging, t] = await Promise.all([getLodging(), getSiteText()]);
  return (
    <div className="container-page py-16 md:py-20">
      <header className="flex flex-col gap-3">
        <p className="type-eyebrow text-crown-blue-deep">Where to stay</p>
        <h1 className="type-display text-h1 text-ink md:text-display">Stay</h1>
        <SeamRule className="w-full max-w-72" />
        <Markdown className="measure text-lead text-ink">{t["stay.intro"]}</Markdown>
      </header>
      <div className="mt-10">
        <StayContent lodging={lodging} />
      </div>
    </div>
  );
}
