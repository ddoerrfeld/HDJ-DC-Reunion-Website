import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { AdminHeader, Notice, SelectField, textLink } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { requireAdmin } from "@/lib/admin/auth";
import { formatDisplayName, foldForSearch } from "@/lib/names";
import { loadRoster, similarClassmates } from "@/lib/classmates/match";
import { requireServiceDb } from "@/lib/supabase/admin";
import { addClassmate, removeClassmate, updateClassmate } from "./actions";

export const metadata: Metadata = { title: "Classmates" };

const SCHOOLS = [
  { value: "jacobs", label: "Jacobs" },
  { value: "crown", label: "Crown" },
];
const input = "min-h-12 w-full rounded-card border-2 border-line-strong bg-paper-raised px-3 text-body text-ink";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function Keep({ q, letter }: { q?: string; letter?: string }) {
  return (
    <>
      {q ? <input type="hidden" name="q" value={q} /> : null}
      {!q && letter ? <input type="hidden" name="letter" value={letter} /> : null}
    </>
  );
}

export default async function AdminClassmates({ searchParams }: { searchParams: Promise<{ q?: string; letter?: string; ok?: string; error?: string }> }) {
  await requireAdmin();
  const p = await searchParams;
  const q = p.q?.trim() ?? "";
  const letter = !q ? (p.letter && /^[A-Z]$/.test(p.letter) ? p.letter : "A") : undefined;
  const [roster, { data: waiting }] = await Promise.all([
    loadRoster(),
    requireServiceDb().from("attendees").select("id, first_name, nickname, hs_last_name, current_last_name, grad_school").eq("status", "active").eq("classmate_status", "pending").order("hs_last_name"),
  ]);
  const byName = (a: (typeof roster)[number], b: (typeof roster)[number]) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name);
  const shown = (
    q
      ? roster.filter((c) => {
          const hay = foldForSearch(`${c.first_name} ${c.last_name}`);
          return foldForSearch(q).split(/\s+/).every((w) => hay.includes(w));
        })
      : roster.filter((c) => c.last_key.toUpperCase().startsWith(letter!))
  ).toSorted(byName);

  return (
    <div className="flex max-w-4xl flex-col gap-10">
      <AdminHeader title="Classmates">
        The senior names read from the two yearbooks ({roster.length} names). An RSVP that matches a name here is confirmed automatically. A
        match needs the same last name and the same first initial (Cathy for Catherine), or a last name off by a letter or two with a matching
        first name. Fix misread spellings here: RSVPs waiting for your check are checked again every time you save.
      </AdminHeader>
      <Notice ok={p.ok} error={p.error} />

      {waiting?.length ? (
        <section aria-labelledby="waiting-h" className="flex flex-col gap-4 rounded-card border-2 border-seam-gold bg-jacobs-tint p-5">
          <h2 id="waiting-h" className="text-h3 text-ink">
            Waiting for your check ({waiting.length})
          </h2>
          <p className="text-body text-ink">
            These RSVPs didn’t match anyone. If the list has their name misspelled, correct it below; or confirm them on their RSVP page.
          </p>
          <ul className="flex flex-col gap-4">
            {waiting.map((a) => {
              const close = similarClassmates({ firstName: a.first_name, hsLastName: a.hs_last_name, currentLastName: a.current_last_name }, roster);
              return (
                <li key={a.id} className="card flex flex-col gap-2 p-4">
                  <Link href={`/admin/rsvps/${a.id}`} className="font-semibold text-crown-blue-deep underline">
                    {formatDisplayName({ firstName: a.first_name, hsLastName: a.hs_last_name, currentLastName: a.current_last_name, nickname: a.nickname })}
                  </Link>
                  {close.length ? (
                    <p className="text-body text-ink">
                      Similar names on the list:{" "}
                      {close.map((c, i) => (
                        <span key={c.id}>
                          {i > 0 ? ", " : ""}
                          <Link href={`/admin/classmates?q=${encodeURIComponent(c.last_name)}#c-${c.id}`} className="font-semibold text-crown-blue-deep underline">
                            {c.first_name} {c.last_name} ({c.school === "crown" ? "Crown" : "Jacobs"})
                          </Link>
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className="text-body text-muted">No similar names on the list.</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="add-h" className="flex flex-col gap-4">
        <h2 id="add-h" className="text-h3 text-ink">
          Add a name
        </h2>
        <p className="text-body text-muted">For classmates who weren’t photographed, or whose name the yearbook missed.</p>
        <form action={addClassmate} className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_10rem_auto]">
          <Keep q={q} letter={letter} />
          <TextField id="add-first" name="first_name" label="First name" required />
          <TextField id="add-last" name="last_name" label="Last name in 1977" required />
          <SelectField id="add-school" name="school" label="School" options={SCHOOLS} />
          <SubmitButton variant="secondary" pendingLabel="Adding…">
            Add
          </SubmitButton>
        </form>
      </section>

      <section aria-labelledby="list-h" className="flex flex-col gap-4">
        <h2 id="list-h" className="text-h3 text-ink">
          Check and correct spellings
        </h2>
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="q" className="text-body font-semibold text-ink">
              Find a name
            </label>
            <span className="relative">
              <Search size={22} strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input id="q" name="q" type="search" defaultValue={q} className="min-h-14 w-full rounded-card border-2 border-line-strong bg-paper-raised py-3 pr-4 pl-11 text-body text-ink" />
            </span>
          </div>
          <Button type="submit" variant="secondary">
            Find
          </Button>
        </form>
        <nav aria-label="Last names starting with" className="flex flex-wrap gap-1">
          {LETTERS.map((l) => (
            <Link
              key={l}
              href={`/admin/classmates?letter=${l}`}
              aria-current={l === letter ? "page" : undefined}
              className="flex min-h-12 min-w-11 items-center justify-center rounded-sm font-semibold text-crown-blue-deep underline aria-[current=page]:bg-ink aria-[current=page]:text-white aria-[current=page]:no-underline"
            >
              {l}
            </Link>
          ))}
        </nav>
        <p className="text-lead text-ink" aria-live="polite">
          {q ? `${shown.length} ${shown.length === 1 ? "name matches" : "names match"} “${q}”` : `Last names starting with ${letter}: ${shown.length}`}
          {q ? (
            <>
              {" · "}
              <Link href="/admin/classmates" className={textLink}>
                Show all
              </Link>
            </>
          ) : null}
        </p>
        <ul className="flex flex-col">
          {shown.map((c) => (
            <li key={c.id} id={`c-${c.id}`} className="scroll-mt-24 border-b border-line py-3">
              <form action={updateClassmate} className="grid items-center gap-2 sm:grid-cols-[1fr_1.3fr_7rem_auto]">
                <Keep q={q} letter={letter} />
                <input type="hidden" name="id" value={c.id} />
                <label className="flex flex-col">
                  <span className="visually-hidden">First name for {c.first_name} {c.last_name}</span>
                  <input name="first_name" defaultValue={c.first_name} required className={input} />
                </label>
                <label className="flex flex-col">
                  <span className="visually-hidden">Last name for {c.first_name} {c.last_name}</span>
                  <input name="last_name" defaultValue={c.last_name} required className={input} />
                </label>
                <label className="flex flex-col">
                  <span className="visually-hidden">School for {c.first_name} {c.last_name}</span>
                  <select name="school" defaultValue={c.school} className={input}>
                    {SCHOOLS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-card border-2 border-ink bg-paper-raised px-4 font-semibold text-ink hover:bg-paper-sunk">
                  Save<span className="visually-hidden"> {c.first_name} {c.last_name}</span>
                </button>
              </form>
              <form action={removeClassmate} className="mt-1">
                <Keep q={q} letter={letter} />
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="inline-flex min-h-12 items-center text-body font-semibold text-crown-blue-deep underline">
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
