"use client";

import { Check, Link2, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { DirectoryData } from "@/lib/data/directory";
import { activeCount, applyFilters, DAYS, DEFAULTS, SCHOOLS, SORTS, toQuery, type Filters, type SortKey } from "@/lib/directory/filters";
import { PersonCard } from "./PersonCard";

const chip =
  "inline-flex min-h-12 items-center gap-2 rounded-pill border-2 px-4 text-body font-semibold transition-colors duration-[var(--dur-ui)] aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white border-line-strong bg-paper-raised text-ink hover:border-ink";

/** Who’s Coming (SPEC §9): summary, search, filters, sort, A–Z, cards. */
export function WhosComing({ data, initial }: { data: DirectoryData; initial: Filters }) {
  const [f, setF] = useState<Filters>(initial);
  const [panelOpen, setPanelOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const activityTitles = useMemo(() => new Map(data.activities.map((a) => [a.slug, a.title])), [data.activities]);
  const results = useMemo(() => applyFilters([...data.people], f), [data.people, f]);
  const active = activeCount(f);
  const total = data.people.length;

  // Keep the URL in step (search is debounced so typing doesn't flood history).
  useEffect(() => {
    const t = window.setTimeout(() => {
      const url = `${window.location.pathname}${toQuery(f)}`;
      if (url !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(window.history.state, "", url);
    }, 250);
    return () => window.clearTimeout(t);
  }, [f]);

  const set = (patch: Partial<Filters>) => setF((prev) => ({ ...prev, ...patch }));
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const schoolCounts = useMemo(() => {
    const c = { crown: 0, jacobs: 0, other: 0 };
    for (const p of data.people) c[p.school] += 1;
    return c;
  }, [data.people]);

  // A–Z jump bar: first card per high-school initial (only meaningful in that sort).
  const letterAnchors = useMemo(() => {
    const map = new Map<string, string>();
    if (f.sort !== "hs") return map;
    for (const p of results) {
      const letter = p.hsLastName.trim().charAt(0).toUpperCase();
      if (/[A-Z]/.test(letter) && !map.has(letter)) map.set(letter, p.id);
    }
    return map;
  }, [results, f.sort]);
  const anchorFor = new Map([...letterAnchors].map(([letter, id]) => [id, `letter-${letter}`]));

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const filtersPanel = (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-2 text-body font-semibold text-ink">School</legend>
        {/* Split pill with 62° seams (SPEC §4.1) */}
        <div className="inline-flex overflow-hidden rounded-pill border-2 border-ink bg-paper-raised">
          {SCHOOLS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={f.school === s.key}
              onClick={() => set({ school: s.key })}
              className="relative flex min-h-12 items-center px-4 text-body font-semibold text-ink aria-pressed:bg-ink aria-pressed:text-white"
            >
              {i > 0 ? <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 skew-x-[-28deg] bg-seam-gold" /> : null}
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      {data.activities.length ? (
        <fieldset>
          <legend className="mb-2 text-body font-semibold text-ink">Events</legend>
          <div className="flex flex-wrap gap-2">
            {data.activities.map((a) => (
              <button key={a.slug} type="button" aria-pressed={f.acts.includes(a.slug)} onClick={() => set({ acts: toggle(f.acts, a.slug) })} className={chip}>
                {f.acts.includes(a.slug) ? <Check size={18} strokeWidth={1.75} aria-hidden="true" /> : null}
                {a.title}
                <span className="font-normal">({a.count})</span>
              </button>
            ))}
          </div>
          {f.acts.length > 1 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="How to combine events">
              <span className="text-body text-ink">Show people going to</span>
              <button type="button" aria-pressed={f.match === "any"} onClick={() => set({ match: "any" })} className={chip}>
                any of these
              </button>
              <button type="button" aria-pressed={f.match === "all"} onClick={() => set({ match: "all" })} className={chip}>
                all of these
              </button>
            </div>
          ) : null}
        </fieldset>
      ) : null}

      <fieldset>
        <legend className="mb-2 text-body font-semibold text-ink">Day</legend>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <button key={d.key} type="button" aria-pressed={f.days.includes(d.key)} onClick={() => set({ days: toggle(f.days, d.key) })} className={chip}>
              {d.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-body font-semibold text-ink">Photos</legend>
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={f.photo} onClick={() => set({ photo: !f.photo })} className={chip}>
            Has a photo
          </button>
          <button type="button" aria-pressed={f.then} onClick={() => set({ then: !f.then })} className={chip}>
            Has a ’77 photo
          </button>
        </div>
      </fieldset>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Summary bar (SPEC §9.2): counts that filter when clicked */}
      <section aria-label="Who’s coming so far" className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-card border-2 border-line bg-paper-raised p-5 shadow-card">
        <p className="flex items-baseline gap-3">
          <span className="font-display text-display leading-none text-ink">{total}</span>
          <span className="text-lead font-semibold text-ink">{total === 1 ? "classmate coming" : "classmates coming"}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {(["crown", "jacobs", "other"] as const).map((s) =>
            schoolCounts[s] ? (
              <button key={s} type="button" aria-pressed={f.school === s} onClick={() => set({ school: f.school === s ? "all" : s })} className={chip}>
                {s === "crown" ? "Crown" : s === "jacobs" ? "Jacobs" : "Other"} <span className="font-normal">{schoolCounts[s]}</span>
              </button>
            ) : null,
          )}
        </div>
        {data.unlisted > 0 ? (
          <p className="text-body text-muted">
            Plus {data.unlisted} more {data.unlisted === 1 ? "classmate" : "classmates"} coming who aren’t listed.
          </p>
        ) : null}
      </section>

      <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
        {/* Filters: sidebar on desktop, a disclosure on phones */}
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-body font-semibold text-ink">Search by name</span>
            <span className="text-small text-muted">First name, nickname, or last name — then or now</span>
            <span className="relative">
              <Search size={22} strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                type="search"
                value={f.q}
                onChange={(e) => set({ q: e.target.value })}
                className="min-h-14 w-full rounded-card border-2 border-line-strong bg-paper-raised py-3 pr-4 pl-11 text-body text-ink"
              />
            </span>
          </label>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-card border-2 border-ink bg-paper-raised px-4 font-semibold text-ink lg:hidden"
            aria-expanded={panelOpen}
            aria-controls="dir-filters"
            onClick={() => setPanelOpen((v) => !v)}
          >
            <SlidersHorizontal size={22} strokeWidth={1.75} aria-hidden="true" />
            {panelOpen ? "Hide filters" : "Filters"}
            {active - (f.q.trim() ? 1 : 0) > 0 ? ` (${active - (f.q.trim() ? 1 : 0)})` : ""}
          </button>
          <div id="dir-filters" className={`${panelOpen ? "block" : "hidden"} lg:block`}>
            {filtersPanel}
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-body font-semibold text-ink">Sort by</span>
            <select
              value={f.sort}
              onChange={(e) => set({ sort: e.target.value as SortKey })}
              className="min-h-14 rounded-card border-2 border-line-strong bg-paper-raised px-4 text-body text-ink"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <section aria-labelledby="dir-results" className="flex min-w-0 flex-col gap-5">
          <h2 id="dir-results" className="sr-only">
            Classmates
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-lead text-ink" aria-live="polite">
              {active ? `Showing ${results.length} of ${total}` : `Showing everyone (${total})`}
            </p>
            {active ? (
              <Button variant="secondary" onClick={() => setF({ ...DEFAULTS, sort: f.sort })} icon={<X size={20} strokeWidth={1.75} aria-hidden="true" />}>
                Clear all filters
              </Button>
            ) : null}
          </div>

          {f.sort === "hs" && results.length > 8 ? (
            <nav aria-label="Jump to last names starting with" className="hidden flex-wrap gap-1 lg:flex">
              {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) =>
                letterAnchors.has(letter) ? (
                  <a key={letter} href={`#letter-${letter}`} className="flex min-h-12 min-w-10 items-center justify-center rounded-sm font-semibold text-crown-blue-deep underline hover:bg-paper-sunk">
                    {letter}
                  </a>
                ) : (
                  <span key={letter} className="flex min-h-12 min-w-10 items-center justify-center text-muted" aria-hidden="true">
                    {letter}
                  </span>
                ),
              )}
            </nav>
          ) : null}

          {results.length ? (
            <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((p) => (
                <li key={p.id}>
                  <PersonCard person={p} activityTitles={activityTitles} anchorId={anchorFor.get(p.id)} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-start gap-4 rounded-card border-2 border-dashed border-line-strong bg-paper-raised p-8">
              <p className="text-h3 text-ink">No one matches yet — share the site with classmates!</p>
              <Button variant="secondary" onClick={copyLink} icon={<Link2 size={20} strokeWidth={1.75} aria-hidden="true" />}>
                {copied ? "Link copied" : "Copy the site link"}
              </Button>
              <p className="sr-only" aria-live="polite">
                {copied ? "Link copied. Paste it into an email or text." : ""}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
