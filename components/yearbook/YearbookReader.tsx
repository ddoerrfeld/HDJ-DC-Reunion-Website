"use client";

import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LayoutGrid,
  Maximize,
  Minimize,
  Search,
  Share2,
  X,
  ZoomIn,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import type { ReaderBook } from "@/lib/yearbook/types";
import { searchYearbookAction } from "@/app/(site)/yearbooks/actions";
import type { YearbookSearchHit } from "@/lib/data/yearbooks";
import { BookStage, type Turn } from "./BookStage";
import { buildSpreads, primaryPage, spreadIndexOf } from "./spreads";
import { ThumbnailList } from "./ThumbnailList";
import { ZoomViewer } from "./ZoomViewer";

interface YearbookReaderProps {
  book: ReaderBook;
  /** Title bar above the book (server-rendered). */
  header?: React.ReactNode;
  initialPage: number;
  searchEnabled: boolean;
}

const control =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-card border-2 border-ink bg-paper-raised px-4 font-semibold text-ink hover:bg-paper-sunk disabled:cursor-not-allowed disabled:opacity-45";
const fullscreenControl =
  "hidden min-h-12 items-center justify-center gap-2 rounded-card border-2 border-ink bg-paper-raised px-4 font-semibold text-ink hover:bg-paper-sunk md:inline-flex";
/** Tool buttons: icon over label, four across on phones; a normal labelled button from md up. */
const tool =
  "inline-flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-card border-2 border-ink bg-paper-raised px-1 text-small font-semibold text-ink hover:bg-paper-sunk md:min-h-12 md:flex-row md:gap-2 md:px-4 md:text-body";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false);
}

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

/** The flip-book reader (SPEC §10.3). */
export function YearbookReader({ book, header, initialPage, searchEnabled }: YearbookReaderProps) {
  const { pages } = book;
  const count = pages.length;
  const spreads = useMemo(() => buildSpreads(count), [count]);
  const reducedMotion = usePrefersReducedMotion();

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [pageIndex, setPageIndex] = useState(() => Math.min(Math.max(initialPage, 1), count) - 1);
  const [turn, setTurn] = useState<Turn | null>(null);
  const turnRef = useRef<Turn | null>(null);
  const [slideFrom, setSlideFrom] = useState<"left" | "right" | null>(null);
  const [railOpen, setRailOpen] = useState(true);
  const [zoomOpen, setZoomOpen] = useState(false);
  const fullscreen = useSyncExternalStore(subscribeFullscreen, () => Boolean(document.fullscreenElement), () => false);
  const canFullscreen = useSyncExternalStore(subscribeFullscreen, () => Boolean(document.fullscreenEnabled), () => false);
  /** One-off announcement (e.g. "Link copied"), tied to the page it was made on. */
  const [notice, setNotice] = useState<{ page: number; text: string } | null>(null);
  const [goValue, setGoValue] = useState("");
  const [goError, setGoError] = useState("");

  const updateTurn = useCallback((next: Turn | null) => {
    turnRef.current = next;
    setTurn(next);
  }, []);

  // Open with the reader filling the window under the sticky header (scrolls past the preview ribbon).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.scrollY > 0) return;
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 0;
    const top = root.getBoundingClientRect().top - header;
    if (top > 0) window.scrollTo({ top, behavior: "instant" });
  }, []);

  // Measure the stage to fit the book and choose spread vs single page.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const mode: "spread" | "single" = size.w >= 860 && size.w / Math.max(size.h, 1) >= 1.2 ? "spread" : "single";
  const aspect = pages[0].width / pages[0].height;
  const pad = mode === "spread" ? 32 : 16;
  const pageHeight = Math.max(0, Math.min(size.h - pad, ((mode === "spread" ? size.w / 2 : size.w) - pad) / aspect));
  const pageWidth = pageHeight * aspect;

  const spreadIndex = spreadIndexOf(spreads, pageIndex);
  const visible = mode === "spread" ? (spreads[spreadIndex].filter((i) => i !== null) as number[]) : [pageIndex];
  const firstVisible = visible[0];
  const lastVisible = visible[visible.length - 1];
  const atStart = mode === "spread" ? spreadIndex === 0 : pageIndex === 0;
  const atEnd = mode === "spread" ? spreadIndex === spreads.length - 1 : pageIndex === count - 1;
  const pageText =
    visible.length === 2
      ? `Pages ${firstVisible + 1}–${lastVisible + 1} of ${count}`
      : `${pages[firstVisible].label} (page ${firstVisible + 1} of ${count})`;

  const status = notice && notice.page === firstVisible ? notice.text : pageText;

  // The deep link (?page=N) follows the page.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", String(firstVisible + 1));
    window.history.replaceState(window.history.state, "", url);
  }, [firstVisible]);

  // Preload neighbours (±2) at display size.
  useEffect(() => {
    for (let d = -2; d <= 3; d++) {
      const page = pages[pageIndex + d];
      if (page && d !== 0) new Image().src = page.display;
    }
  }, [pageIndex, pages]);

  const startTurn = useCallback(
    (to: number) => {
      if (turnRef.current || to < 0 || to >= spreads.length) return;
      if (reducedMotion) {
        setPageIndex(primaryPage(spreads[to]));
        return;
      }
      const from = spreadIndexOf(spreads, pageIndex);
      updateTurn({ from, to, progress: 0, animating: false });
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (turnRef.current) updateTurn({ ...turnRef.current, progress: 1, animating: true });
        }),
      );
    },
    [pageIndex, reducedMotion, spreads, updateTurn],
  );

  const finishTurn = useCallback(() => {
    const t = turnRef.current;
    if (!t) return;
    if (t.progress >= 1) setPageIndex(primaryPage(spreads[t.to]));
    updateTurn(null);
  }, [spreads, updateTurn]);

  /** Go to a page: jump instantly, animating only the final turn (SPEC §10.3). */
  const goTo = useCallback(
    (index: number) => {
      const target = Math.min(Math.max(index, 0), count - 1);
      if (turnRef.current) return;
      if (mode === "single") {
        if (target === pageIndex) return;
        setSlideFrom(reducedMotion ? null : target > pageIndex ? "right" : "left");
        setPageIndex(target);
        return;
      }
      const from = spreadIndexOf(spreads, pageIndex);
      const to = spreadIndexOf(spreads, target);
      if (to === from) return;
      if (Math.abs(to - from) === 1 || reducedMotion) {
        if (reducedMotion) setPageIndex(target);
        else startTurn(to);
        return;
      }
      const before = to > from ? to - 1 : to + 1;
      setPageIndex(primaryPage(spreads[before]));
      requestAnimationFrame(() => {
        updateTurn({ from: before, to, progress: 0, animating: false });
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (turnRef.current) updateTurn({ ...turnRef.current, progress: 1, animating: true });
          }),
        );
      });
    },
    [count, mode, pageIndex, reducedMotion, spreads, startTurn, updateTurn],
  );

  const step = useCallback(
    (delta: 1 | -1) => {
      if (mode === "single") goTo(pageIndex + delta);
      else startTurn(spreadIndexOf(spreads, pageIndex) + delta);
    },
    [goTo, mode, pageIndex, spreads, startTurn],
  );

  const toggleThumbnails = useCallback(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) setRailOpen((open) => !open);
    else sheetRef.current?.showModal();
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen().catch(() => {});
  }, []);

  // Keyboard: ←/→ turn, Home/End, Z zoom, T thumbnails (SPEC §10.3). Esc is native (dialogs, full screen).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (zoomOpen || e.altKey || e.ctrlKey || e.metaKey || target.closest("input, textarea, select, dialog")) return;
      const map: Record<string, () => void> = {
        ArrowRight: () => step(1),
        PageDown: () => step(1),
        ArrowLeft: () => step(-1),
        PageUp: () => step(-1),
        Home: () => goTo(0),
        End: () => goTo(count - 1),
        z: () => setZoomOpen(true),
        Z: () => setZoomOpen(true),
        t: toggleThumbnails,
        T: toggleThumbnails,
      };
      const action = map[e.key];
      if (action) {
        e.preventDefault();
        action();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, goTo, step, toggleThumbnails, zoomOpen]);

  async function share() {
    const url = `${window.location.origin}${window.location.pathname}?page=${firstVisible + 1}`;
    const title = `${book.shortName} yearbook, ${pages[firstVisible].label}`;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNotice({ page: firstVisible, text: `Link to ${pages[firstVisible].label} copied. Paste it into an email or text.` });
    } catch {
      setNotice({ page: firstVisible, text: `Copy this link: ${url}` });
    }
  }

  function submitGoTo(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(goValue);
    if (!Number.isInteger(n) || n < 1 || n > count) {
      setGoError(`Enter a page number from 1 to ${count}.`);
      return;
    }
    setGoError("");
    goTo(n - 1);
  }

  const seniors = book.seniorsStart;
  const selectFromRail = (index: number) => {
    sheetRef.current?.close();
    goTo(index);
  };

  return (
    <div ref={rootRef} className="flex h-[calc(100dvh-var(--header-h))] min-h-[560px] flex-col bg-paper-sunk">
      {header}
      <div className="flex min-h-0 flex-1">
        {/* Desktop thumbnail rail */}
        {railOpen ? (
          <aside aria-label="Thumbnails" className="hidden w-72 shrink-0 flex-col border-r border-line bg-paper lg:flex">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <h2 className="text-h3 font-heading text-ink">Pages</h2>
              {seniors ? (
                <button type="button" className="text-body font-semibold text-crown-blue-deep underline" onClick={() => goTo(seniors - 1)}>
                  Jump to seniors
                </button>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <ThumbnailList pages={pages} current={visible} onSelect={goTo} bookName={book.shortName} />
            </div>
          </aside>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          {searchEnabled ? <NameSearch school={book.school} onJump={(n) => goTo(n - 1)} /> : null}
          <div ref={stageRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
            {pageHeight > 0 ? (
              <BookStage
                mode={mode}
                pages={pages}
                spreads={spreads}
                spreadIndex={spreadIndex}
                pageIndex={pageIndex}
                turn={turn}
                pageWidth={pageWidth}
                pageHeight={pageHeight}
                bookName={book.shortName}
                slideFrom={slideFrom}
                onTurnStart={startTurn}
                onTurnDrag={(to, progress) => updateTurn({ from: spreadIndex, to, progress, animating: false })}
                onTurnRelease={(complete) => {
                  const t = turnRef.current;
                  if (!t) return;
                  const target = complete ? 1 : 0;
                  if (t.progress === target) finishTurn();
                  else updateTurn({ ...t, progress: target, animating: true });
                }}
                onTurnEnd={finishTurn}
                onStep={step}
                onZoom={() => setZoomOpen(true)}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Controls: large and labelled (SPEC §10.3). Phones get two compact rows; "Go to page" lives in the Pages sheet there. */}
      <nav aria-label="Yearbook controls" className="border-t border-line bg-paper px-2 py-2 sm:px-4 sm:py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 sm:gap-3">
          <div className="flex w-full items-center justify-between gap-2 md:w-auto md:justify-center md:gap-3">
            <button type="button" className={control} onClick={() => step(-1)} disabled={atStart}>
              <ChevronLeft size={22} strokeWidth={1.75} aria-hidden="true" />
              Previous
            </button>
            <p className="text-center font-semibold text-ink md:hidden">
              {visible.length === 2 ? `${firstVisible + 1}–${lastVisible + 1}` : firstVisible + 1} of {count}
            </p>
            <div className="hidden md:block">
              <GoToPage value={goValue} error={goError} current={firstVisible + 1} count={count} onChange={setGoValue} onSubmit={submitGoTo} idPrefix="yb-bar" />
            </div>
            <button type="button" className={control} onClick={() => step(1)} disabled={atEnd}>
              Next
              <ChevronRight size={22} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
          <span className="hidden h-8 w-px bg-line md:block" aria-hidden="true" />
          <div className="grid w-full grid-cols-4 gap-2 md:flex md:w-auto md:gap-3">
            <button type="button" className={tool} onClick={() => setZoomOpen(true)}>
              <ZoomIn size={22} strokeWidth={1.75} aria-hidden="true" />
              Zoom
            </button>
            <button type="button" className={tool} onClick={toggleThumbnails} aria-expanded={railOpen}>
              <LayoutGrid size={22} strokeWidth={1.75} aria-hidden="true" />
              Pages
            </button>
            {seniors ? (
              <button type="button" className={`${tool} lg:hidden`} onClick={() => goTo(seniors - 1)}>
                <GraduationCap size={22} strokeWidth={1.75} aria-hidden="true" />
                Seniors
              </button>
            ) : null}
            {canFullscreen ? (
              <button type="button" className={fullscreenControl} onClick={toggleFullscreen}>
                {fullscreen ? <Minimize size={22} strokeWidth={1.75} aria-hidden="true" /> : <Maximize size={22} strokeWidth={1.75} aria-hidden="true" />}
                {fullscreen ? "Exit full screen" : "Full screen"}
              </button>
            ) : null}
            <button type="button" className={tool} onClick={share}>
              <Share2 size={22} strokeWidth={1.75} aria-hidden="true" />
              <span>
                Share<span className="hidden md:inline"> this page</span>
              </span>
            </button>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {status}
        </p>
      </nav>

      {/* Phone/tablet thumbnails: bottom sheet */}
      <dialog
        ref={sheetRef}
        aria-label={`${book.shortName} pages`}
        className="mt-auto mb-0 max-h-[85dvh] w-full max-w-none rounded-t-lg bg-paper p-0 backdrop:bg-ink/50"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-paper px-4 py-3">
          <h2 className="text-h3 font-heading text-ink">Pages</h2>
          <div className="flex gap-2">
            {seniors ? (
              <button type="button" className={control} onClick={() => selectFromRail(seniors - 1)}>
                Jump to seniors
              </button>
            ) : null}
            <button type="button" className={control} onClick={() => sheetRef.current?.close()}>
              <X size={22} strokeWidth={1.75} aria-hidden="true" />
              Close
            </button>
          </div>
        </div>
        <div className="border-b border-line px-4 py-3">
          <GoToPage
            value={goValue}
            error={goError}
            current={firstVisible + 1}
            count={count}
            onChange={setGoValue}
            onSubmit={(e) => {
              submitGoTo(e);
              if (Number(goValue) >= 1 && Number(goValue) <= count) sheetRef.current?.close();
            }}
            idPrefix="yb-sheet"
          />
        </div>
        <div className="p-3">
          <ThumbnailList pages={pages} current={visible} onSelect={selectFromRail} bookName={book.shortName} columns={3} />
        </div>
      </dialog>

      {zoomOpen ? (
        <ZoomViewer
          pages={visible.map((i) => pages[i])}
          initial={visible.length === 2 ? 1 : 0}
          bookName={book.shortName}
          onClose={() => setZoomOpen(false)}
        />
      ) : null}
    </div>
  );
}

function GoToPage({
  value,
  error,
  current,
  count,
  onChange,
  onSubmit,
  idPrefix,
}: {
  value: string;
  error: string;
  current: number;
  count: number;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  idPrefix: string;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2" noValidate>
      <label htmlFor={`${idPrefix}-go`} className="font-semibold text-ink">
        Go to page
      </label>
      <input
        id={`${idPrefix}-go`}
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        placeholder={String(current)}
        aria-describedby={`${idPrefix}-total ${idPrefix}-error`}
        aria-invalid={error ? true : undefined}
        className="min-h-12 w-20 rounded-card border-2 border-ink bg-paper-raised px-3 text-center text-body"
      />
      <span id={`${idPrefix}-total`} className="text-ink">
        of {count}
      </span>
      <button type="submit" className={control}>
        Go
      </button>
      <p id={`${idPrefix}-error`} role="alert" className="w-full font-semibold text-ink empty:hidden">
        {error}
      </p>
    </form>
  );
}

function NameSearch({ school, onJump }: { school: ReaderBook["school"]; onJump: (pageNumber: number) => void }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<YearbookSearchHit[] | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="border-b border-line bg-paper px-3 py-3 sm:px-4">
      <form
        role="search"
        className="mx-auto flex max-w-3xl flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => setHits(await searchYearbookAction(school, query)));
        }}
      >
        <label className="flex min-w-0 flex-1 flex-col gap-1 font-semibold text-ink">
          Find a name
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-12 rounded-card border-2 border-ink bg-paper-raised px-3 text-body font-normal"
          />
        </label>
        <button type="submit" className={control} disabled={pending}>
          <Search size={22} strokeWidth={1.75} aria-hidden="true" />
          {pending ? "Searching…" : "Search"}
        </button>
      </form>
      {hits ? (
        <div className="mx-auto mt-3 max-w-3xl" aria-live="polite">
          {hits.length === 0 ? (
            <p className="text-ink">No pages found. Try just the last name; the text was read by computer and isn’t perfect.</p>
          ) : (
            <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
              {hits.map((hit) => (
                <li key={hit.number}>
                  <button type="button" className="w-full rounded-card px-3 py-2 text-left hover:bg-paper-sunk" onClick={() => onJump(hit.number)}>
                    <span className="font-semibold text-crown-blue-deep underline">{hit.label}</span>{" "}
                    <span className="text-muted">{hit.snippet}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
