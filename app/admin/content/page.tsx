import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { AdminHeader, Notice } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { SITE_TEXT } from "@/lib/content/site-text";
import { getSiteText } from "@/lib/data/settings";
import { saveSiteText } from "./actions";

export const metadata: Metadata = { title: "Site text" };

const control = "w-full rounded-card border-2 border-line-strong bg-paper-raised px-4 py-3 text-body text-ink";
const slug = (group: string) => group.toLowerCase().replace(/[^a-z]+/g, "-");

export default async function AdminSiteText({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const { ok, error } = await searchParams;
  const current = await getSiteText();
  const groups = [...new Set(SITE_TEXT.map((e) => e.group))];

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <AdminHeader title="Site text">
        Headings and paragraphs around the site. Event names, times, places and prices are edited under{" "}
        <Link href="/admin/events" className="font-semibold text-crown-blue-deep underline">
          Events
        </Link>
        ; hotels under{" "}
        <Link href="/admin/stay" className="font-semibold text-crown-blue-deep underline">
          Stay
        </Link>
        ; questions & answers under{" "}
        <Link href="/admin/settings" className="font-semibold text-crown-blue-deep underline">
          Settings
        </Link>
        . Empty a box and save to go back to the original wording.
      </AdminHeader>
      <Notice ok={ok} error={error} />
      <nav aria-label="Jump to" className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <a key={g} href={`#${slug(g)}`} className="inline-flex min-h-12 items-center rounded-pill border-2 border-line-strong bg-paper-raised px-4 font-semibold text-ink no-underline hover:border-ink">
            {g}
          </a>
        ))}
      </nav>
      <form action={saveSiteText} className="flex flex-col gap-10">
        {groups.map((g) => (
          <fieldset key={g} id={slug(g)} className="flex scroll-mt-24 flex-col gap-6">
            <legend className="mb-2 text-h3 text-ink">{g}</legend>
            {SITE_TEXT.filter((e) => e.group === g).map((e) => {
              const id = e.key.replace(/\./g, "-");
              const value = current[e.key];
              const changed = value !== e.default;
              const describedBy = [`${id}-hint`, changed && e.default ? `${id}-orig` : ""].filter(Boolean).join(" ");
              return (
                <div key={e.key} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor={id} className="text-body font-semibold text-ink">
                      {e.label}
                    </label>
                    {changed ? <span className="rounded-pill bg-jacobs-tint px-2 py-0.5 text-small font-semibold text-ink">Changed</span> : null}
                  </div>
                  <p id={`${id}-hint`} className="text-small text-muted">
                    {"hint" in e ? `${e.hint} ` : ""}
                    {e.kind === "text" ? (e.key.startsWith("email.") ? "Plain text; a blank line starts a new paragraph." : "Blank line = new paragraph; **double asterisks** for bold, *single* for italics.") : ""}
                  </p>
                  {e.kind === "text" ? (
                    <textarea id={id} name={e.key} rows={Math.min(8, Math.max(3, Math.ceil(value.length / 70) + 1))} defaultValue={value} aria-describedby={describedBy} className={`${control} font-sans`} />
                  ) : (
                    <input id={id} name={e.key} defaultValue={value} aria-describedby={describedBy} className={`${control} min-h-14`} />
                  )}
                  {changed && e.default ? (
                    <p id={`${id}-orig`} className="text-small text-muted">
                      Original: {e.default}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </fieldset>
        ))}
        <div className="sticky bottom-0 -mx-4 border-t-2 border-line bg-paper/95 px-4 py-3">
          <SubmitButton>Save site text</SubmitButton>
        </div>
      </form>
    </div>
  );
}
