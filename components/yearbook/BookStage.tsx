"use client";

import { useRef, useState } from "react";
import type { YearbookCrop } from "@/lib/yearbook/crop";
import type { ReaderPage } from "@/lib/yearbook/types";
import { PageImage } from "./PageImage";
import type { Spread } from "./spreads";

export interface Turn {
  from: number;
  to: number;
  /** 0 → 1: how far the leaf has turned. */
  progress: number;
  /** true while CSS animates progress (false while following a finger). */
  animating: boolean;
}

interface BookStageProps {
  /** Page index + crop to outline once (from a "See me in ’77" link). */
  highlight?: { index: number; crop: YearbookCrop } | null;
  mode: "spread" | "single";
  pages: ReaderPage[];
  spreads: Spread[];
  spreadIndex: number;
  pageIndex: number;
  turn: Turn | null;
  pageWidth: number;
  pageHeight: number;
  bookName: string;
  /** Single-page slide direction for the entrance animation. */
  slideFrom: "left" | "right" | null;
  onTurnStart: (to: number) => void;
  onTurnDrag: (to: number, progress: number) => void;
  onTurnRelease: (complete: boolean) => void;
  onTurnEnd: () => void;
  onStep: (delta: 1 | -1) => void;
  onZoom: () => void;
}

const DRAG_THRESHOLD = 8;

/** "See me in ’77": a gold outline around a classmate's portrait that fades after ~2 s. */
function HighlightBox({ crop }: { crop: YearbookCrop }) {
  return (
    <div
      aria-hidden="true"
      className="yb-highlight pointer-events-none absolute rounded-sm outline-4 outline-seam-gold [box-shadow:0_0_0_3px_var(--ink),0_0_24px_6px_rgb(232_163_23/0.55)]"
      style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.w * 100}%`, height: `${crop.h * 100}%` }}
    />
  );
}

function Face({ page, alt, side, highlight }: { page: ReaderPage | null; alt: string; side: "left" | "right"; highlight?: YearbookCrop | null }) {
  return (
    <div className={`relative h-full w-full overflow-hidden bg-paper-raised ${side === "left" ? "rounded-l-sm" : "rounded-r-sm"}`}>
      {page ? <PageImage page={page} alt={alt} eager /> : null}
      {highlight ? <HighlightBox crop={highlight} /> : null}
      {/* Gutter shadow toward the spine. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 w-8 ${
          side === "left" ? "right-0 bg-gradient-to-l" : "left-0 bg-gradient-to-r"
        } from-ink/20 to-transparent`}
      />
    </div>
  );
}

/**
 * The book itself. Spread mode shows two pages with a 3D page turn you can click,
 * drag or swipe; single mode shows one page and slides between pages. The leaf
 * is two back-to-back faces rotating around the spine; under reduced motion the
 * reader never creates a Turn, so pages simply swap.
 */
export function BookStage(props: BookStageProps) {
  const { mode, pages, spreads, spreadIndex, pageIndex, turn, pageWidth, pageHeight, bookName } = props;
  const drag = useRef<{ x: number; side: "left" | "right" | "single"; to: number | null; moved: boolean } | null>(null);
  const [dragX, setDragX] = useState(0);
  const altFor = (index: number | null) => (index === null ? "" : `${bookName}, ${pages[index].label}`);
  const pageAt = (index: number | null) => (index === null ? null : pages[index]);

  function onPointerDown(e: React.PointerEvent<HTMLElement>) {
    const side = e.currentTarget.dataset.side as "left" | "right" | "single";
    if (e.button !== 0 || turn?.animating) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const to = side === "right" ? spreadIndex + 1 : side === "left" ? spreadIndex - 1 : null;
    const valid = to === null || (to >= 0 && to < spreads.length);
    drag.current = { x: e.clientX, side, to: valid ? to : null, moved: false };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    d.moved = true;
    if (d.side === "single") {
      setDragX(dx);
      return;
    }
    if (d.to === null) return;
    const progress = Math.min(Math.max(d.side === "right" ? -dx / pageWidth : dx / pageWidth, 0), 1);
    props.onTurnDrag(d.to, progress);
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (d.side === "single") {
      setDragX(0);
      if (d.moved && Math.abs(dx) > 60) props.onStep(dx < 0 ? 1 : -1);
      return;
    }
    if (!d.moved) {
      // A click on a page edge turns it.
      if (d.to !== null) props.onTurnStart(d.to);
      return;
    }
    if (d.to !== null) props.onTurnRelease(turn ? turn.progress > 0.3 : false);
  }

  const pointerHandlers = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };

  if (mode === "single") {
    const page = pages[pageIndex];
    return (
      <div
        className="relative touch-pan-y select-none"
        style={{ width: pageWidth, height: pageHeight }}
        onDoubleClick={props.onZoom}
        data-side="single"
        {...pointerHandlers}
      >
        <div
          key={page.id}
          className={`h-full w-full overflow-hidden rounded-sm bg-paper-raised shadow-[0_18px_40px_-18px_rgb(30_27_22/0.55)] ${
            props.slideFrom === "right" ? "yb-slide-from-right" : props.slideFrom === "left" ? "yb-slide-from-left" : ""
          }`}
          style={dragX ? { transform: `translateX(${dragX}px)`, transition: "none" } : undefined}
        >
          <PageImage page={page} alt={altFor(pageIndex)} eager />
          {props.highlight?.index === pageIndex && !dragX ? <HighlightBox crop={props.highlight.crop} /> : null}
        </div>
      </div>
    );
  }

  const current = spreads[spreadIndex];
  let baseLeft = current[0];
  let baseRight = current[1];
  let leaf: { front: number | null; back: number | null; forward: boolean } | null = null;
  if (turn) {
    const from = spreads[turn.from];
    const to = spreads[turn.to];
    const forward = turn.to > turn.from;
    baseLeft = forward ? from[0] : to[0];
    baseRight = forward ? to[1] : from[1];
    leaf = forward ? { front: from[1], back: to[0], forward } : { front: from[0], back: to[1], forward };
  }

  const angle = turn ? (leaf!.forward ? -180 : 180) * turn.progress : 0;
  const shade = turn ? Math.sin(turn.progress * Math.PI) * 0.35 : 0;

  return (
    <div
      className="relative flex select-none [perspective:2600px]"
      style={{ width: pageWidth * 2, height: pageHeight }}
      role="group"
      aria-roledescription="open book"
      aria-label={`${bookName}: ${[baseLeft, baseRight].filter((i) => i !== null).map((i) => pages[i!].label).join(" and ")}`}
    >
      {/* Spine shadow under the pages */}
      <div aria-hidden="true" className="absolute inset-y-0 left-1/2 w-10 -translate-x-1/2 bg-gradient-to-r from-transparent via-ink/25 to-transparent" />
      {(["left", "right"] as const).map((side) => {
        const index = side === "left" ? baseLeft : baseRight;
        return (
          <div
            key={side}
            className={`relative h-full touch-pan-y ${index === null ? "" : "cursor-pointer shadow-[0_18px_40px_-18px_rgb(30_27_22/0.55)]"}`}
            style={{ width: pageWidth }}
            data-side={side}
            {...(index === null ? {} : pointerHandlers)}
          >
            {index === null ? null : (
              <Face page={pageAt(index)} alt={altFor(index)} side={side} highlight={!turn && props.highlight?.index === index ? props.highlight.crop : null} />
            )}
          </div>
        );
      })}

      {leaf ? (
        <div
          aria-hidden="true"
          className="absolute top-0 h-full [transform-style:preserve-3d]"
          style={{
            width: pageWidth,
            left: leaf.forward ? pageWidth : 0,
            transformOrigin: leaf.forward ? "left center" : "right center",
            transform: `rotateY(${angle}deg)`,
            transition: turn!.animating ? "transform 620ms cubic-bezier(0.45, 0.05, 0.25, 1)" : "none",
          }}
          onTransitionEnd={(e) => {
            if (e.propertyName === "transform") props.onTurnEnd();
          }}
        >
          <div className="absolute inset-0 [backface-visibility:hidden]">
            {leaf.front === null ? <div className="h-full w-full bg-paper-raised" /> : <Face page={pageAt(leaf.front)} alt="" side={leaf.forward ? "right" : "left"} />}
            <div className="absolute inset-0 bg-ink" style={{ opacity: shade }} />
          </div>
          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            {leaf.back === null ? <div className="h-full w-full bg-paper-raised" /> : <Face page={pageAt(leaf.back)} alt="" side={leaf.forward ? "left" : "right"} />}
            <div className="absolute inset-0 bg-ink" style={{ opacity: shade * 0.6 }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
