"use client";

import { ArrowLeft, BookOpen, Minus, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { loadSeeMeBook, type SeeMeBookResult } from "@/app/(site)/rsvp/see-me-actions";
import { ThumbnailList } from "@/components/yearbook/ThumbnailList";
import { Button } from "@/components/ui/Button";
import type { ThenPhotoState } from "@/lib/rsvp/form-model";
import { THEN_ASPECT, type YearbookCrop } from "@/lib/yearbook/crop";
import type { ReaderBook, ReaderPage, YearbookSchool } from "@/lib/yearbook/types";

interface Person {
  firstName: string;
  hsLastName: string;
  nickname: string;
  currentLastName: string;
  gradSchool: string;
}

type Phase = "loading" | "locked" | "unavailable" | "choose" | "tap" | "crop";

const pill =
  "inline-flex min-h-12 items-center justify-center rounded-card border-2 px-4 font-semibold aria-pressed:border-jacobs-brown aria-pressed:bg-jacobs-gold aria-pressed:text-jacobs-brown";

/** The chosen portrait, cropped in CSS from the page image until the RSVP is saved (then the rendered file). */
export function ThenPreview({ value, size = 128 }: { value: ThenPhotoState; size?: number }) {
  const height = Math.round(size / THEN_ASPECT);
  if (value.renderedUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- rendered portrait in storage
      <img src={value.renderedUrl} alt="Your 1977 senior portrait" width={size} height={height} className="rounded-sm object-cover ring-1 ring-line" style={{ width: size, height }} />
    );
  }
  if (!value.preview) return null;
  const { crop } = value;
  return (
    <div className="relative overflow-hidden rounded-sm bg-paper-sunk ring-1 ring-line" style={{ width: size, height }} role="img" aria-label="Your 1977 senior portrait">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed CDN image, cropped with CSS */}
      <img
        src={value.preview.src}
        alt=""
        className="absolute max-w-none"
        style={{ width: `${100 / crop.w}%`, left: `${(-crop.x / crop.w) * 100}%`, top: `${(-crop.y / crop.h) * 100}%` }}
      />
    </div>
  );
}

/**
 * "See Me in ’77" (SPEC §10.4): find your own senior portrait and crop it.
 * Most classmates land straight on their page (their name was found in the
 * roster); then one tap on their photo pre-zooms the crop box around it.
 */
export function SeeMePicker({
  value,
  onChange,
  person,
}: {
  value: ThenPhotoState | null;
  onChange: (value: ThenPhotoState | null) => void;
  person: Person;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sectionTitleRef = useRef<HTMLHeadingElement>(null);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [school, setSchool] = useState<YearbookSchool>(person.gradSchool === "jacobs" ? "jacobs" : "crown");
  const [books, setBooks] = useState<Partial<Record<YearbookSchool, ReaderBook>>>({});
  const [suggestion, setSuggestion] = useState<{ school: YearbookSchool; number: number } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState<ReaderPage | null>(null);
  const [initialArea, setInitialArea] = useState<Area | undefined>(undefined);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [, startTransition] = useTransition();

  const book = books[school];

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
  }, [open]);

  // Announce each step by moving focus to its heading.
  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open, phase]);

  function load(target: YearbookSchool) {
    setSchool(target);
    setShowAll(false);
    if (books[target]) {
      setPhase("choose");
      return;
    }
    setPhase("loading");
    startTransition(async () => {
      const result: SeeMeBookResult = await loadSeeMeBook(target, person);
      if (result.status !== "ok") {
        setPhase(result.status);
        return;
      }
      setBooks((b) => ({ ...b, [target]: result.book }));
      if (result.suggestion) {
        setSuggestion(result.suggestion);
        if (result.suggestion.school !== target && !books[result.suggestion.school]) {
          // Their name is in the other book: open that one instead.
          load(result.suggestion.school);
          return;
        }
      }
      setPhase("choose");
    });
  }

  function start() {
    setOpen(true);
    load(school);
  }

  function close() {
    dialogRef.current?.close();
    setOpen(false);
    // The button that opened the dialog may be gone (Find → Change): return focus to this section.
    requestAnimationFrame(() => sectionTitleRef.current?.focus());
  }

  function choosePage(p: ReaderPage) {
    setPage(p);
    setPhase("tap");
  }

  /** Tap on the page: pre-zoom a portrait-sized crop box around that spot. */
  function tapAt(e: React.MouseEvent<HTMLImageElement>) {
    if (!page) return;
    const r = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    const w = 0.2; // a senior portrait is ~15–20% of the page width
    const h = (w * page.width) / THEN_ASPECT / page.height;
    setInitialArea({
      x: Math.min(Math.max(fx - w / 2, 0), 1 - w) * 100,
      y: Math.min(Math.max(fy - h / 2, 0), 1 - h) * 100,
      width: w * 100,
      height: h * 100,
    });
    setPhase("crop");
  }

  function placeMyself() {
    setInitialArea(undefined);
    setCropPos({ x: 0, y: 0 });
    setZoom(3);
    setPhase("crop");
  }

  function accept() {
    if (!page || !area) return;
    const crop: YearbookCrop = { x: area.x / 100, y: area.y / 100, w: area.width / 100, h: area.height / 100 };
    onChange({
      pageId: page.id,
      crop,
      label: `${book?.shortName ?? ""}, ${page.label}`,
      preview: { src: page.displayJpg, width: page.width, height: page.height },
      renderedUrl: null,
    });
    close();
  }

  const seniorPages =
    book && book.seniorsStart && book.seniorsEnd ? book.pages.slice(book.seniorsStart - 1, book.seniorsEnd) : [];
  const listPages = showAll || seniorPages.length === 0 ? (book?.pages ?? []) : seniorPages;
  const suggested = suggestion && suggestion.school === school && book ? book.pages[suggestion.number - 1] : null;

  return (
    <section aria-labelledby="see-me-title" className="flex flex-col gap-4 rounded-card border-2 border-line bg-paper-raised p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <BookOpen size={28} strokeWidth={1.75} className="mt-1 shrink-0 text-crown-blue-deep" aria-hidden="true" />
        <div>
          <h3 id="see-me-title" ref={sectionTitleRef} tabIndex={-1} className="text-h3 text-ink focus:outline-none">
            Find yourself in the ’77 yearbook
          </h3>
          <p className="mt-1 text-body text-ink">
            Pick out your senior portrait. Classmates will see it next to your photo today — then and now. Optional,
            and you can do it later from your private link.
          </p>
        </div>
      </div>

      {value ? (
        <div className="flex flex-wrap items-center gap-5">
          <ThenPreview value={value} />
          <div className="flex flex-col gap-3">
            <p className="font-semibold text-ink">{value.label || "Your 1977 portrait"}</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={start}>
                Change
              </Button>
              <Button variant="secondary" onClick={() => onChange(null)} icon={<Trash2 size={20} strokeWidth={1.75} aria-hidden="true" />}>
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <Button variant="secondary" onClick={start}>
            Find my senior photo
          </Button>
        </div>
      )}

      {open ? (
        <dialog
          ref={dialogRef}
          onClose={() => {
            setOpen(false);
            requestAnimationFrame(() => sectionTitleRef.current?.focus());
          }}
          aria-labelledby="see-me-dialog-title"
          className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-paper p-0"
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h2 id="see-me-dialog-title" ref={headingRef} tabIndex={-1} className="text-h3 text-ink focus:outline-none">
                {phase === "tap" ? "Tap your photo" : phase === "crop" ? "Frame your portrait" : "Find your page"}
              </h2>
              <button
                type="button"
                onClick={close}
                className="inline-flex min-h-12 items-center gap-2 rounded-card border-2 border-ink px-4 font-semibold text-ink"
              >
                <X size={22} strokeWidth={1.75} aria-hidden="true" />
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {phase === "loading" ? (
                <p className="p-6 text-lead text-ink" role="status">
                  Opening the yearbook…
                </p>
              ) : null}
              {phase === "locked" ? (
                <div className="mx-auto max-w-2xl p-6">
                  <p className="text-lead text-ink">
                    We couldn’t match your name to the 1977 senior portraits yet. Finish your RSVP — once the organizer
                    confirms you, open your private link and pick your photo then.
                  </p>
                </div>
              ) : null}
              {phase === "unavailable" ? (
                <p className="p-6 text-lead text-ink">The yearbooks aren’t available just yet. You can add your photo later from your private link.</p>
              ) : null}

              {phase === "choose" && book ? (
                <div className="mx-auto flex max-w-5xl flex-col gap-5 p-4 sm:p-6">
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Which yearbook">
                    {(["crown", "jacobs"] as const).map((s) => (
                      <button key={s} type="button" aria-pressed={school === s} className={`${pill} border-ink text-ink`} onClick={() => load(s)}>
                        {s === "crown" ? "Crown ’77" : "Jacobs ’77"}
                      </button>
                    ))}
                  </div>
                  {suggested ? (
                    <div className="flex flex-col gap-4 rounded-card border-l-4 border-jacobs-brown bg-jacobs-gold/25 p-4 sm:flex-row sm:items-center">
                      <p className="flex flex-1 items-center gap-3 text-lead font-semibold text-ink">
                        <Sparkles size={26} strokeWidth={1.75} className="shrink-0 text-jacobs-brown" aria-hidden="true" />
                        We found your name on {suggested.label.toLowerCase()}.
                      </p>
                      <Button onClick={() => choosePage(suggested)}>Open {suggested.label.toLowerCase()}</Button>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-h3 text-ink">{showAll || seniorPages.length === 0 ? "All pages" : "Senior portraits"}</h3>
                    {seniorPages.length > 0 ? (
                      <button type="button" className="min-h-12 font-semibold text-crown-blue-deep underline" onClick={() => setShowAll((v) => !v)}>
                        {showAll ? "Show just the seniors" : "Show every page"}
                      </button>
                    ) : null}
                  </div>
                  <ThumbnailListGrid pages={listPages} onSelect={choosePage} bookName={book.shortName} />
                </div>
              ) : null}

              {phase === "tap" && page ? (
                <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 sm:p-6">
                  <p className="text-lead text-ink">Tap your own portrait. Next you can move and zoom the frame to fit.</p>
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed CDN image; tapping is a pointer shortcut, "Place the frame myself" is the keyboard path */}
                  <img
                    src={page.displayJpg}
                    alt={`${book?.shortName}, ${page.label}`}
                    width={page.width}
                    height={page.height}
                    onClick={tapAt}
                    className="w-full cursor-crosshair rounded-sm shadow-card"
                  />
                  <div className="flex flex-wrap gap-3">
                    <Button variant="secondary" onClick={() => setPhase("choose")} icon={<ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />}>
                      Choose a different page
                    </Button>
                    <Button variant="secondary" onClick={placeMyself}>
                      Place the frame myself
                    </Button>
                  </div>
                </div>
              ) : null}

              {phase === "crop" && page ? (
                <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 sm:p-6">
                  <p className="text-body text-ink">Drag the page to center your face in the frame. Pinch or use the buttons to zoom.</p>
                  <div className="relative h-[55dvh] min-h-72 overflow-hidden rounded-sm bg-ink">
                    <Cropper
                      image={page.displayJpg}
                      aspect={THEN_ASPECT}
                      crop={cropPos}
                      zoom={zoom}
                      minZoom={1}
                      maxZoom={10}
                      zoomSpeed={0.4}
                      initialCroppedAreaPercentages={initialArea}
                      onCropChange={setCropPos}
                      onZoomChange={setZoom}
                      onCropComplete={(pct) => setArea(pct)}
                      showGrid={false}
                      objectFit="contain"
                      mediaProps={{ alt: `${book?.shortName}, ${page.label}` }}
                      cropperProps={{ role: "group", "aria-label": "Crop frame. Use arrow keys to move." } as React.HTMLAttributes<HTMLDivElement>}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="secondary" onClick={() => setZoom((z) => Math.max(1, z / 1.4))} icon={<Minus size={20} strokeWidth={1.75} aria-hidden="true" />}>
                      Zoom out
                    </Button>
                    <Button variant="secondary" onClick={() => setZoom((z) => Math.min(10, z * 1.4))} icon={<Plus size={20} strokeWidth={1.75} aria-hidden="true" />}>
                      Zoom in
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-3 border-t border-line pt-4">
                    <Button onClick={accept} disabled={!area}>
                      Looks right
                    </Button>
                    <Button variant="secondary" onClick={() => setPhase("tap")}>
                      Try again
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </dialog>
      ) : null}
    </section>
  );
}

function ThumbnailListGrid({ pages, onSelect, bookName }: { pages: ReaderPage[]; onSelect: (p: ReaderPage) => void; bookName: string }) {
  return (
    <div className="[&_ol]:grid-cols-3 sm:[&_ol]:grid-cols-4 lg:[&_ol]:grid-cols-6">
      <ThumbnailList pages={pages} current={[]} onSelect={(i) => onSelect(pages[i])} bookName={bookName} columns={3} />
    </div>
  );
}
