"use client";

import { useEffect, useRef } from "react";
import type { ReaderPage } from "@/lib/yearbook/types";

interface ThumbnailListProps {
  pages: ReaderPage[];
  /** 0-based indexes currently on screen (one, or two in a spread). */
  current: number[];
  onSelect: (index: number) => void;
  bookName: string;
  /** Grid columns: 2 in the side rail, 3 in the phone sheet. */
  columns?: 2 | 3;
}

/**
 * Thumbnails with page labels (SPEC §10.3). ~180 items: instead of a JS
 * virtualizer, `content-visibility: auto` skips layout/paint off-screen and
 * images load lazily, which keeps it fast without breaking find-in-page or
 * screen-reader navigation.
 */
export function ThumbnailList({ pages, current, onSelect, bookName, columns = 2 }: ThumbnailListProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const first = current[0];

  // Keep the current page in view as the reader moves.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${first}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [first]);

  return (
    <ol
      ref={listRef}
      aria-label={`${bookName} pages`}
      className={`grid gap-3 ${columns === 3 ? "grid-cols-3" : "grid-cols-2"}`}
    >
      {pages.map((page, index) => {
        const active = current.includes(index);
        return (
          <li key={page.id} data-index={index} className="[contain-intrinsic-size:auto_190px] [content-visibility:auto]">
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-current={active ? "page" : undefined}
              className={`flex w-full flex-col items-center gap-1 rounded-card p-1.5 text-small font-semibold ${
                active ? "bg-jacobs-gold/35 text-ink ring-2 ring-jacobs-brown" : "text-ink hover:bg-paper-sunk"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- signed CDN thumbnail */}
              <img
                src={page.thumb}
                alt=""
                width={240}
                height={Math.round((240 * page.height) / page.width)}
                loading="lazy"
                decoding="async"
                className="aspect-[1100/1440] w-full bg-paper-sunk object-contain shadow-card"
              />
              <span>{page.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
