import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { AdminHeader, Notice } from "@/components/admin/ui";
import { TextField } from "@/components/ui/Field";
import { requireAdmin } from "@/lib/admin/auth";
import { isYearbookSchool, SCHOOL_NAMES } from "@/lib/data/yearbooks";
import { requireServiceDb } from "@/lib/supabase/admin";
import { expiryFor, signedYearbookUrl, yearbookCdnConfigured } from "@/lib/yearbook/sign";
import { addClassmate, removeClassmate, saveBook, savePages } from "./actions";

export const metadata: Metadata = { title: "Yearbooks" };

export default async function AdminYearbooks({ searchParams }: { searchParams: Promise<{ book?: string; ok?: string; error?: string }> }) {
  await requireAdmin();
  const p = await searchParams;
  const school = p.book && isYearbookSchool(p.book) ? p.book : "jacobs";
  const db = requireServiceDb();
  const [{ data: book }, { data: pages }, { data: roster }] = await Promise.all([
    db.from("yearbook_books").select("*").eq("school", school).maybeSingle(),
    db.from("yearbook_pages").select("id, seq, page_label, hidden, thumb_url").eq("school", school).order("seq"),
    db.from("classmates").select("id, first_name, last_name, source").eq("school", school).order("last_name").order("first_name"),
  ]);
  const exp = expiryFor();
  const thumbs = yearbookCdnConfigured();

  return (
    <div className="flex flex-col gap-10">
      <AdminHeader title="Yearbooks">Page labels, hidden pages, the seniors section and the classmate list used for the name check.</AdminHeader>
      <nav aria-label="Choose a yearbook" className="flex flex-wrap gap-2">
        {(["jacobs", "crown"] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/yearbooks?book=${s}`}
            aria-current={s === school ? "page" : undefined}
            className="inline-flex min-h-12 items-center rounded-pill border-2 border-line-strong bg-paper-raised px-5 font-semibold text-ink no-underline aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
          >
            {SCHOOL_NAMES[s].short}
          </Link>
        ))}
      </nav>
      <Notice ok={p.ok} error={p.error} />

      {book ? (
        <section aria-labelledby="book-h" className="flex max-w-3xl flex-col gap-4">
          <h2 id="book-h" className="text-h3 text-ink">
            The book
          </h2>
          <form action={saveBook} className="flex flex-col gap-5">
            <input type="hidden" name="school" value={school} />
            <TextField id="title" name="title" label="Title" defaultValue={book.title} required />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField id="seniors_start" name="seniors_start" inputMode="numeric" label="Seniors start at file" optional defaultValue={book.seniors_start_seq ?? ""} />
              <TextField id="seniors_end" name="seniors_end" inputMode="numeric" label="Seniors end at file" optional defaultValue={book.seniors_end_seq ?? ""} />
            </div>
            <p className="text-small text-muted">File numbers are shown under each page below. “Jump to seniors” in the reader uses them.</p>
            <div>
              <SubmitButton>Save</SubmitButton>
            </div>
          </form>
        </section>
      ) : null}

      <section id="pages" aria-labelledby="pages-h" className="flex scroll-mt-24 flex-col gap-4">
        <h2 id="pages-h" className="text-h3 text-ink">
          Pages
        </h2>
        {pages?.length ? (
          <form action={savePages} className="flex flex-col gap-5">
            <input type="hidden" name="school" value={school} />
            <input type="hidden" name="ids" value={pages.map((pg) => pg.id).join(",")} />
            <p className="text-body text-muted">A label replaces “Page N” in the reader (for example the printed page number, or “Seniors”). Hidden pages are skipped, and the pages after them renumber.</p>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {pages.map((pg) => (
                <li key={pg.id} className={`card flex flex-col gap-2 p-3 [content-visibility:auto] [contain-intrinsic-size:auto_420px] ${pg.hidden ? "bg-paper-sunk" : ""}`}>
                  {thumbs ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed CDN thumbnail
                    <img src={signedYearbookUrl(pg.thumb_url, exp)} alt="" width={240} height={320} loading="lazy" className={`h-auto w-full rounded-sm ${pg.hidden ? "opacity-40" : ""}`} />
                  ) : null}
                  <span className="text-small font-semibold text-muted">File {pg.seq}</span>
                  <label className="flex flex-col gap-1">
                    <span className="visually-hidden">Label for file {pg.seq}</span>
                    <input name={`label-${pg.id}`} defaultValue={pg.page_label ?? ""} placeholder="Label" className="min-h-12 w-full rounded-card border-2 border-line-strong bg-paper-raised px-3 text-body text-ink" />
                  </label>
                  <label className="flex min-h-12 items-center gap-2">
                    <input type="checkbox" name={`hidden-${pg.id}`} defaultChecked={pg.hidden} className="size-6 accent-crown-blue-deep" />
                    <span className="text-body text-ink">
                      Hidden<span className="visually-hidden"> (file {pg.seq})</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="sticky bottom-0 -mx-4 border-t-2 border-line bg-paper/95 px-4 py-3">
              <SubmitButton>Save pages</SubmitButton>
            </div>
          </form>
        ) : (
          <p className="text-body text-muted">No pages loaded for this book.</p>
        )}
      </section>

      <section id="roster" aria-labelledby="roster-h" className="flex scroll-mt-24 flex-col gap-4">
        <h2 id="roster-h" className="text-h3 text-ink">
          Classmate list ({roster?.length ?? 0})
        </h2>
        <p className="measure text-body text-muted">
          Read from the senior portraits. An RSVP whose name matches is confirmed automatically; anyone else waits for your check. Add people who
          weren’t photographed, or fix a misread name by removing it and adding it correctly.
        </p>
        <form action={addClassmate} className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="school" value={school} />
          <TextField id="cm-first" name="first_name" label="First name" required />
          <TextField id="cm-last" name="last_name" label="Last name in 1977" required />
          <SubmitButton variant="secondary" pendingLabel="Adding…">
            Add
          </SubmitButton>
        </form>
        <ul className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
          {roster?.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 border-b border-line py-1">
              <span className="text-body text-ink">
                {c.last_name}, {c.first_name}
                {c.source === "manual" ? <span className="text-small text-muted"> · added</span> : null}
              </span>
              <form action={removeClassmate}>
                <input type="hidden" name="school" value={school} />
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="inline-flex min-h-12 items-center font-semibold text-crown-blue-deep underline">
                  Remove<span className="visually-hidden"> {c.first_name} {c.last_name}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
