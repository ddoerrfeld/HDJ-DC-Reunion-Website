"use client";

import { Minus, Plus, Scan, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReaderPage } from "@/lib/yearbook/types";

interface ZoomViewerProps {
  /** Pages the reader can switch between (one, or left/right of a spread). */
  pages: ReaderPage[];
  initial: number;
  bookName: string;
  onClose: () => void;
}

interface View {
  scale: number;
  x: number;
  y: number;
}

const MAX_OVER_FIT = 6;

function fitFor(page: ReaderPage, w: number, h: number): View {
  const scale = Math.min(w / page.width, h / page.height);
  return { scale, x: (w - page.width * scale) / 2, y: (h - page.height * scale) / 2 };
}
const controlClass =
  "inline-flex min-h-12 items-center gap-2 rounded-card border-2 border-white/80 bg-ink/80 px-4 font-semibold text-white hover:bg-ink";
/** Bottom zoom buttons: icon over label on phones so three fit across. */
const zoomControl =
  "pointer-events-auto inline-flex min-h-14 min-w-24 flex-col items-center justify-center gap-0.5 rounded-card border-2 border-white/80 bg-ink/80 px-3 font-semibold text-white hover:bg-ink sm:min-h-12 sm:flex-row sm:gap-2 sm:px-4";

/**
 * Full-screen zoom for reading names under portraits (SPEC §10.3): pinch,
 * mouse wheel, drag to pan, double-tap / double-click to zoom in or back out,
 * plus large + / − / Fit buttons and keyboard (+, −, 0, arrows, Esc).
 */
export function ZoomViewer({ pages, initial, bookName, onClose }: ZoomViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [which, setWhich] = useState(initial);
  const page = pages[which] ?? pages[0];
  // The surface is the whole viewport, so the first fit can be computed up front.
  const [view, setViewState] = useState<View>(() => fitFor(page, window.innerWidth, window.innerHeight));
  const viewRef = useRef(view);
  const setView = useCallback((next: View) => {
    viewRef.current = next;
    setViewState(next);
  }, []);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  const bounds = useCallback(() => {
    const el = surfaceRef.current;
    const w = el?.clientWidth ?? window.innerWidth;
    const h = el?.clientHeight ?? window.innerHeight;
    const fit = Math.min(w / page.width, h / page.height);
    return { w, h, fit, max: fit * MAX_OVER_FIT };
  }, [page.width, page.height]);

  const clamp = useCallback(
    (next: View): View => {
      const { w, h, fit, max } = bounds();
      const scale = Math.min(Math.max(next.scale, fit), max);
      const iw = page.width * scale;
      const ih = page.height * scale;
      const x = iw <= w ? (w - iw) / 2 : Math.min(0, Math.max(w - iw, next.x));
      const y = ih <= h ? (h - ih) / 2 : Math.min(0, Math.max(h - ih, next.y));
      return { scale, x, y };
    },
    [bounds, page.width, page.height],
  );

  const fitView = useCallback(() => setView(clamp({ scale: bounds().fit, x: 0, y: 0 })), [bounds, clamp, setView]);

  // Re-fit on resize / rotation.
  useEffect(() => {
    window.addEventListener("resize", fitView);
    return () => window.removeEventListener("resize", fitView);
  }, [fitView]);

  function showPage(i: number) {
    setWhich(i);
    const el = surfaceRef.current;
    setView(fitFor(pages[i], el?.clientWidth ?? window.innerWidth, el?.clientHeight ?? window.innerHeight));
  }

  const zoomAt = useCallback(
    (factor: number, px?: number, py?: number) => {
      const { w, h } = bounds();
      const v = viewRef.current;
      const cx = px ?? w / 2;
      const cy = py ?? h / 2;
      const target = clamp({ scale: v.scale * factor, x: 0, y: 0 }).scale;
      const k = target / v.scale;
      setView(clamp({ scale: target, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k }));
    },
    [bounds, clamp, setView],
  );

  const local = (e: { clientX: number; clientY: number }) => {
    const r = surfaceRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function onPointerDown(e: React.PointerEvent) {
    surfaceRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: viewRef.current.scale };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const now = local(e);
    pointers.current.set(e.pointerId, now);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const target = (pinch.current.scale * distance) / pinch.current.distance;
      zoomAt(target / viewRef.current.scale, (a.x + b.x) / 2, (a.y + b.y) / 2);
    } else if (pointers.current.size === 1) {
      const v = viewRef.current;
      setView(clamp({ ...v, x: v.x + now.x - prev.x, y: v.y + now.y - prev.y }));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const point = local(e);
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    // Double tap / double click: zoom to 3× fit at that spot, or back to fit.
    const t = e.timeStamp;
    const tap = lastTap.current;
    if (tap && t - tap.t < 320 && Math.hypot(point.x - tap.x, point.y - tap.y) < 30) {
      lastTap.current = null;
      const { fit } = bounds();
      if (viewRef.current.scale > fit * 1.1) fitView();
      else zoomAt((fit * 3) / viewRef.current.scale, point.x, point.y);
    } else {
      lastTap.current = { t, ...point };
    }
  }

  function onWheel(e: React.WheelEvent) {
    const p = local(e);
    zoomAt(Math.exp(-e.deltaY * 0.0015), p.x, p.y);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const step = 80;
    const v = viewRef.current;
    const actions: Record<string, () => void> = {
      "+": () => zoomAt(1.5),
      "=": () => zoomAt(1.5),
      "-": () => zoomAt(1 / 1.5),
      "0": fitView,
      ArrowLeft: () => setView(clamp({ ...v, x: v.x + step })),
      ArrowRight: () => setView(clamp({ ...v, x: v.x - step })),
      ArrowUp: () => setView(clamp({ ...v, y: v.y + step })),
      ArrowDown: () => setView(clamp({ ...v, y: v.y - step })),
    };
    const action = actions[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={`${bookName}, ${page.label}, zoomed`}
      onClose={onClose}
      onKeyDown={onKeyDown}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-ink p-0 text-white backdrop:bg-ink"
    >
      <div
        ref={surfaceRef}
        className="absolute inset-0 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {view.scale > 0 ? (
          <picture>
            <source type="image/webp" srcSet={page.zoom} />
            <img
              src={page.displayJpg}
              alt={`${bookName}, ${page.label}`}
              width={page.width}
              height={page.height}
              draggable={false}
              className="absolute top-0 left-0 max-w-none origin-top-left select-none"
              style={{ width: page.width, height: page.height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
            />
          </picture>
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-3 sm:p-4">
        <div className="pointer-events-auto flex flex-wrap gap-2">
          {pages.length > 1
            ? pages.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={i === which}
                  onClick={() => showPage(i)}
                  className={`${controlClass} ${i === which ? "border-jacobs-gold" : ""}`}
                >
                  {i === 0 ? "Left page" : "Right page"}
                </button>
              ))
            : null}
        </div>
        <button type="button" onClick={() => dialogRef.current?.close()} className={`pointer-events-auto ${controlClass}`} autoFocus>
          <X size={22} strokeWidth={1.75} aria-hidden="true" />
          Close
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
        <button type="button" onClick={() => zoomAt(1 / 1.5)} className={zoomControl}>
          <Minus size={22} strokeWidth={1.75} aria-hidden="true" />
          Zoom out
        </button>
        <button type="button" onClick={fitView} className={zoomControl}>
          <Scan size={22} strokeWidth={1.75} aria-hidden="true" />
          Fit
        </button>
        <button type="button" onClick={() => zoomAt(1.5)} className={zoomControl}>
          <Plus size={22} strokeWidth={1.75} aria-hidden="true" />
          Zoom in
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {page.label}. Pinch or use the Zoom buttons; drag to move around.
      </p>
    </dialog>
  );
}
