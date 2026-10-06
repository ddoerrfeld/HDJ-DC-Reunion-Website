"use client";

import { useEffect, useRef } from "react";
import { MONOGRAM } from "@/components/brand/monogram-geometry";

/**
 * Portrait mosaic for the home hero: the 1977 senior portraits (tinted in each
 * school's colors) fly in and assemble into the “77” monogram, its seam lying
 * exactly on the hero's 62° seam, then settle back to a faint watermark as the
 * headline arrives. Decorative only (aria-hidden).
 *
 * Timing follows the hero's CSS timeline (it starts at first paint, before
 * React), so a slow phone joins mid-flight instead of starting late. With
 * reduced motion, a replayed visit, or Skip, it draws the final state at once.
 */

export interface MosaicMeta {
  tile: number;
  cols: number;
  crown: number;
  jacobs: number;
}

const RECEDE_START = 2400; // ms; every portrait is in place by about 2.0 s
const RECEDE_END = 3100;
// Brightness of the monogram portraits and of the background wall: while playing → final watermark.
const GLYPH_ALPHA = [1, 0.3] as const;
const WALL_ALPHA = [0.2, 0.07] as const;
const WALL_FADE = [150, 1250] as const; // ms

type Kind = "crown" | "jacobs" | "seam"; // "seam" cells are left empty
interface Cell {
  x: number; // final top-left, CSS px
  y: number;
  kind: Kind;
  tile: number; // sprite index (crown first, then jacobs)
  wall: boolean; // background wall (faint) rather than part of the monogram
  sx: number; // start position, rotation, scale
  sy: number;
  rot: number;
  scale: number;
  delay: number;
  dur: number;
}

const K = 1 / Math.tan((62 * Math.PI) / 180);
const VB = { x: 0, y: -20, w: 150, h: 120 };

function shuffled(n: number, seed: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  let s = seed;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Lays the monogram over the hero so its seam sits on the hero seam (center, 62°). */
function layout(W: number, H: number, meta: MosaicMeta): { cells: Cell[]; size: number } {
  const unit = Math.min((H * 0.74) / VB.h, (W * 0.92) / VB.w); // px per monogram unit
  // Monogram seam centerline at mid-height (y = 50) → hero center.
  const seamMid = MONOGRAM_SEAM_X0 + 1.5 - 50 * K;
  const ox = W / 2 - seamMid * unit;
  const oy = H / 2 - 50 * unit;

  const probe = document.createElement("canvas").getContext("2d")!;
  const paths: Array<[Kind, Path2D]> = [
    ["seam", new Path2D(`M ${MONOGRAM.seam.replace(/ /g, " L ")} Z`)],
    ["crown", new Path2D(`M ${MONOGRAM.crownSeven.replace(/ /g, " L ")} Z`)],
    ["crown", new Path2D(MONOGRAM.horn)],
    ["jacobs", new Path2D(`M ${MONOGRAM.jacobsSeven.replace(/ /g, " L ")} Z`)],
    ["jacobs", new Path2D(MONOGRAM.wing)],
  ];

  // Cells big enough for faces to read: about a third of a 7's stroke.
  const size = Math.max(18, Math.min(40, unit * 7));
  // The grid covers the whole hero; cells inside the monogram are bright, the rest a faint wall of the class.
  const gx0 = ox - Math.ceil(ox / size) * size;
  const gy0 = oy - Math.ceil(oy / size) * size;
  const crownOrder = shuffled(meta.crown, 77);
  const jacobsOrder = shuffled(meta.jacobs, 1977);
  let ci = 0;
  let ji = 0;
  let r = 42;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const cells: Cell[] = [];
  for (let y = gy0; y < H; y += size) {
    for (let x = gx0; x < W; x += size) {
      const cx = x + size / 2;
      const cy = y + size / 2;
      const hit = paths.find(([, p]) => probe.isPointInPath(p, (cx - ox) / unit, (cy - oy) / unit));
      // The hero's own gold seam shows through the monogram's seam slot.
      if (hit?.[0] === "seam") continue;
      const glyph = Boolean(hit);
      // Wall cells take the school of their side of the 62° hero seam.
      const seamX = W / 2 + (H / 2 - cy) * K;
      const kind: Kind = hit ? hit[0] : cx < seamX ? "crown" : "jacobs";
      const tile = kind === "crown" ? crownOrder[ci++ % meta.crown] : meta.crown + jacobsOrder[ji++ % meta.jacobs];
      const fromLeft = kind === "crown";
      cells.push({
        x,
        y,
        kind,
        tile,
        wall: !glyph,
        // Monogram portraits sweep in, Crown from the left and Jacobs from the right; the wall fades up in place.
        sx: glyph ? (fromLeft ? -0.25 * W + rand() * 0.6 * W : 0.65 * W + rand() * 0.6 * W) : x,
        sy: glyph ? -0.2 * H + rand() * 1.4 * H : y,
        rot: glyph ? (rand() - 0.5) * 1.6 : 0,
        scale: glyph ? 0.5 + rand() * 1.4 : 1,
        delay: glyph ? rand() * 850 : 0,
        dur: glyph ? 700 + rand() * 450 : 1,
      });
    }
  }
  return { cells, size };
}

// x of the seam's top-left corner in monogram units (see monogram-geometry.ts).
const MONOGRAM_SEAM_X0 = Number(MONOGRAM.seam.split(",")[0]);

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function HeroMosaic({ src, meta }: { src: string; meta: MosaicMeta }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const root = document.documentElement;
    const sprite = new Image();
    sprite.decoding = "async";
    sprite.src = src;

    let frame = 0;
    let W = 0;
    let H = 0;
    let dpr = 1;
    let state = layout(1, 1, meta);
    // The background wall never moves: draw it once into its own layer, then blit it each frame.
    const wall = document.createElement("canvas");
    let wallReady = false;
    const paintWall = () => {
      wallReady = false;
      if (!sprite.complete || !sprite.naturalWidth) return;
      wall.width = Math.round(W * dpr);
      wall.height = Math.round(H * dpr);
      const w = wall.getContext("2d");
      if (!w) return;
      w.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { cells, size } = state;
      const gap = size > 24 ? 2 : 1;
      for (const c of cells) {
        if (!c.wall) continue;
        w.drawImage(sprite, (c.tile % meta.cols) * meta.tile, Math.floor(c.tile / meta.cols) * meta.tile, meta.tile, meta.tile, c.x + gap / 2, c.y + gap / 2, size - gap, size - gap);
      }
      wallReady = true;
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state = layout(W, H, meta);
      paintWall();
    };

    /** Elapsed time of the hero's CSS intro, or null when it isn't playing. */
    const elapsed = (): number | null => {
      if (root.dataset.hero !== "play") return null;
      const t = document.querySelector(".hero-content")?.getAnimations()[0]?.currentTime;
      return typeof t === "number" ? t : null;
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      if (!sprite.complete || !sprite.naturalWidth) return;
      const { cells, size } = state;
      const gap = size > 24 ? 2 : 1;
      const recede = easeOut(Math.min(1, Math.max(0, (t - RECEDE_START) / (RECEDE_END - RECEDE_START))));
      const glyphAlpha = GLYPH_ALPHA[0] + (GLYPH_ALPHA[1] - GLYPH_ALPHA[0]) * recede;
      const wallAlpha = WALL_ALPHA[0] + (WALL_ALPHA[1] - WALL_ALPHA[0]) * recede;
      if (!wallReady) paintWall();
      if (wallReady) {
        ctx.globalAlpha = wallAlpha * easeOut(Math.min(1, Math.max(0, (t - WALL_FADE[0]) / (WALL_FADE[1] - WALL_FADE[0]))));
        ctx.drawImage(wall, 0, 0, W, H);
      }
      ctx.globalAlpha = glyphAlpha;
      for (const c of cells) {
        if (c.wall) continue;
        const p = Math.min(1, Math.max(0, (t - c.delay) / c.dur));
        if (p <= 0) continue;
        const e = easeOut(p);
        const x = c.sx + (c.x - c.sx) * e + size / 2;
        const y = c.sy + (c.y - c.sy) * e + size / 2;
        const s = (size - gap) * (c.scale + (1 - c.scale) * e);
        const a = c.rot * (1 - e);
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        ctx.setTransform(dpr * cos, dpr * sin, -dpr * sin, dpr * cos, dpr * x, dpr * y);
        ctx.drawImage(sprite, (c.tile % meta.cols) * meta.tile, Math.floor(c.tile / meta.cols) * meta.tile, meta.tile, meta.tile, -s / 2, -s / 2, s, s);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
    };

    const tick = () => {
      const t = elapsed();
      if (t === null) {
        draw(Infinity);
        return;
      }
      draw(t);
      if (t < RECEDE_END) frame = requestAnimationFrame(tick);
      else draw(Infinity);
    };

    resize();
    sprite.onload = () => {
      paintWall();
      tick();
    };
    if (sprite.complete) tick();

    // Skip / end of intro → final state at once.
    const observer = new MutationObserver(() => {
      if (root.dataset.hero !== "play") {
        cancelAnimationFrame(frame);
        draw(Infinity);
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-hero"] });
    const sizeObserver = new ResizeObserver(() => {
      resize();
      if (elapsed() === null) draw(Infinity);
    });
    sizeObserver.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      sizeObserver.disconnect();
      sprite.onload = null;
    };
  }, [src, meta]);

  return <canvas ref={canvasRef} className="hero-mosaic" aria-hidden="true" />;
}
