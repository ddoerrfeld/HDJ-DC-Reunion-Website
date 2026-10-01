"use client";

import { BookOpen, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CrownVikingMark, JacobsMark1977 } from "@/components/brand/SchoolMarks";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import type { DirectoryPerson } from "@/lib/data/directory";

const SCHOOL_LABEL = { crown: "Crown ’77", jacobs: "Jacobs ’77", other: "Attended both" } as const;

/** Top edge in the school's color; a split for "Other/attended both" (SPEC §4.1). */
const EDGE = { crown: "bg-crown-blue", jacobs: "bg-jacobs-gold", other: "split-surface" } as const;

function SchoolBadge({ school }: { school: DirectoryPerson["school"] }) {
  return (
    <span className="inline-flex items-center gap-2 text-body font-semibold text-ink">
      {school === "crown" ? <CrownVikingMark className="size-6" title="" /> : null}
      {school === "jacobs" ? <JacobsMark1977 className="size-6 text-jacobs-brown" title="" /> : null}
      {school === "other" ? (
        <span className="flex size-6 overflow-hidden rounded-full" aria-hidden="true">
          <span className="w-1/2 bg-crown-blue" />
          <span className="w-1/2 bg-jacobs-brown" />
        </span>
      ) : null}
      {SCHOOL_LABEL[school]}
    </span>
  );
}

function Img({ src, alt }: { src: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- pre-sized storage image
  return <img src={src} alt={alt} width={512} height={512} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />;
}

/**
 * One classmate (SPEC §9.2, §10.4): today's photo with a "’77" tab that flips
 * the card to their senior portrait (tap or keyboard, never hover); the flip is
 * a cross-fade under reduced motion.
 */
export function PersonCard({ person, activityTitles, anchorId }: { person: DirectoryPerson; activityTitles: Map<string, string>; anchorId?: string }) {
  const [showThen, setShowThen] = useState(false);
  const { then } = person;
  const canFlip = Boolean(then && person.photo);
  const firstName = person.name.split(" ")[0];

  const content = canFlip ? (
        <div className={`dir-flip absolute inset-0 ${showThen ? "is-flipped" : ""}`}>
          <div className="dir-face absolute inset-0">
            <Img src={person.photo!} alt={`${person.name} today`} />
          </div>
          <div className="dir-face dir-back absolute inset-0 bg-ink">
            <Img src={then!.photo} alt={`${person.name} in 1977`} />
          </div>
        </div>
      ) : person.photo ? (
        <Img src={person.photo} alt={person.name} />
      ) : then ? (
        <Img src={then.photo} alt={`${person.name} in 1977`} />
      ) : null;
  // No photo at all → PhotoFrame's monogram placeholder in the school colors.
  const photo = (
    <PhotoFrame school={person.school} size="100%" className="max-w-64">
      {content ? (
        <>
          {content}
          {then && (showThen || !person.photo) ? (
            <span className="absolute top-2 left-2 rounded-sm bg-ink/85 px-2 py-0.5 font-display text-small tracking-wide text-white">’77</span>
          ) : null}
        </>
      ) : undefined}
    </PhotoFrame>
  );

  return (
    <article id={anchorId} className="card flex scroll-mt-28 flex-col overflow-hidden" aria-labelledby={`p-${person.id}`}>
      <div className={`h-1.5 ${EDGE[person.school]}`} aria-hidden="true" />
      <div className="flex flex-1 flex-col gap-4 p-5">
        {canFlip ? (
          <button
            type="button"
            onClick={() => setShowThen((v) => !v)}
            aria-pressed={showThen}
            className="group relative block rounded-sm text-left"
          >
            {photo}
            <span className="mt-2 inline-flex min-h-12 items-center gap-2 font-semibold text-crown-blue-deep underline">
              <RefreshCw size={18} strokeWidth={1.75} aria-hidden="true" />
              {showThen ? "Show today’s photo" : "Show the ’77 photo"}
              <span className="visually-hidden"> of {person.name}</span>
            </span>
          </button>
        ) : (
          photo
        )}
        <div className="flex flex-col gap-2">
          <h3 id={`p-${person.id}`} className="text-h3 text-ink">
            {person.name}
          </h3>
          <SchoolBadge school={person.school} />
        </div>
        {person.activities.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label={`${firstName}’s events`}>
            {person.activities.map((slug) => (
              <li key={slug} className="rounded-pill border border-line-strong bg-paper px-3 py-1 text-small font-semibold text-ink">
                {activityTitles.get(slug) ?? slug}
              </li>
            ))}
          </ul>
        ) : null}
        {then ? (
          <Link
            href={`/yearbooks/${then.school}?page=${then.page}&hl=${[then.crop.x, then.crop.y, then.crop.w, then.crop.h].map((v) => v.toFixed(4)).join(",")}`}
            className="mt-auto inline-flex min-h-12 items-center gap-2 font-semibold text-crown-blue-deep underline"
          >
            <BookOpen size={20} strokeWidth={1.75} aria-hidden="true" />
            See {firstName} in ’77
          </Link>
        ) : null}
      </div>
    </article>
  );
}
