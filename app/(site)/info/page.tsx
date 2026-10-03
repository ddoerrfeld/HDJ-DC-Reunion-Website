import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeamRule } from "@/components/brand/Seam";
import { ComingSoonCard } from "@/components/ui/ComingSoonCard";
import { Markdown } from "@/components/ui/Markdown";
import { getFeatureFlags, getPublicSettings } from "@/lib/data/settings";
import { parseFaq } from "@/lib/faq";
import { formatLongDate } from "@/lib/format";

export const metadata: Metadata = { title: "Info" };
export const revalidate = 60;

/** Questions & answers (SPEC §2, optional; the organizer turns it on and writes it in /admin). */
export default async function InfoPage() {
  const [flags, settings] = await Promise.all([getFeatureFlags(), getPublicSettings()]);
  if (!flags.faq) notFound();
  const { intro, items } = parseFaq(settings.faqMd);

  return (
    <div className="container-page py-16 md:py-20">
      <header className="flex flex-col gap-3">
        <p className="type-eyebrow text-crown-blue-deep">Good to know</p>
        <h1 className="type-display text-h1 text-ink md:text-display">Info</h1>
        <SeamRule className="w-full max-w-72" />
        {intro ? <Markdown className="measure text-lead text-ink">{intro}</Markdown> : null}
      </header>
      <div className="mt-10 flex max-w-3xl flex-col gap-6">
        {items.length === 0 && !settings.refundPolicyMd ? <ComingSoonCard title="Questions & answers" /> : null}
        {items.map((item) => (
          <section key={item.question} className="card flex flex-col gap-3 p-6">
            <h2 className="text-h3 text-ink">{item.question}</h2>
            <Markdown className="text-body text-ink">{item.answerMd}</Markdown>
          </section>
        ))}
        {settings.refundPolicyMd ? (
          <section className="card flex flex-col gap-3 p-6">
            <h2 className="text-h3 text-ink">Refunds</h2>
            <Markdown className="text-body text-ink">{settings.refundPolicyMd}</Markdown>
            {settings.refundCutoffDate ? <p className="text-body font-semibold text-ink">Refunds are available until {formatLongDate(settings.refundCutoffDate)}.</p> : null}
          </section>
        ) : null}
        {settings.organizerContactEmail ? (
          <p className="text-lead text-ink">
            Something else? Email the organizers at <a href={`mailto:${settings.organizerContactEmail}`}>{settings.organizerContactEmail}</a>.
          </p>
        ) : null}
      </div>
    </div>
  );
}
