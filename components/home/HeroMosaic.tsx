"use client";

import { useEffect, useRef } from "react";
import { MONOGRAM } from "@/components/brand/monogram-geometry";

/**
 * Portrait mosaic for the home hero (owner request): the 1977 senior portraits,
 * tinted in each school's colors, arrive one after another at a steady pace and
 * build the “77” from top to bottom. The full 77 holds for a moment, then
 * recedes to a faint watermark as the headline arrives. Decorative (aria-hidden).
 *
 * The two 7s stand apart from the hero's split line, with a clear channel along
 * it. Timing follows the hero's CSS timeline (it starts at first paint, before
 * React), so a slow phone joins in progress rather than starting late. Reduced
 * motion, a repeat visit, or Skip draw the final watermark at once.
 */

export interface MosaicMeta {
  tile: number;
  cols: number;
  crown: number;
  jacobs: number;
}

// Timeline, ms from first paint (hero.css: whole intro = 8 s).
const BUILD_START = 900; // first portrait
const BUILD_END = 5000; // last portrait starts arriving; constant pace between
const ARRIVE = 500; // each portrait's own fade-and-settle
const FLOURISH = [1300, 2100] as const; // horn and wing fade in once the top bars have begun
const RECEDE_START = 6600;
const RECEDE_END = 7400;
const FINAL_ALPHA = 0.26; // watermark behind the headline
const FRAME = "#F7F1E3"; // paper-colored print border, sets the 77 apart from the background
const HORN = "#AECAF0"; // Crown portrait highlight blue
const WING = "#F0B429"; // Jacobs gold

type Kind = "crown" | "jacobs";
interface Cell {
  x: number; // final top-left, CSS px
  y: number;
  tile: number; // sprite index (crown first, then jacobs)
  delay: number;
}

const K = 1 / Math.tan((62 * Math.PI) / 180);
const VB = { x: 0, y: -20, w: 150, h: 120 };
// x of the monogram seam's top-left corner, in monogram units (monogram-geometry.ts).
const SEAM_X0 = Number(MONOGRAM.seam.split(",")[0]);

function seeded(seed: number) {
  let r = seed;
  return () => (r = (r * 16807) % 2147483647) / 2147483647;
}

function shuffled(n: number, rand: () => number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Fills the two 7s with portrait cells, set apart from the hero seam. */
interface Placement {
  oy: number; // top of the 7s, CSS px
  unit: number; // px per monogram unit
  hornX: number; // where the horn's base starts: left end of the Crown 7's top row of prints
  wingX: number; // where the wing's base ends: right end of the Jacobs 7's top row
}

// Base anchors in monogram units: the Crown 7's top-left and the Jacobs 7's top-right corners.
const CROWN_LEFT = Number(MONOGRAM.crownSeven.split(",")[0]);
const JACOBS_RIGHT = Number(MONOGRAM.jacobsSeven.split(" ")[1].split(",")[0]);

function layout(W: number, H: number, meta: MosaicMeta): { cells: Cell[]; size: number; at: Placement } {
  // Monogram seam centerline at mid-height (y = 50) → hero center, so both 7s run parallel to the split.
  const seamMid = SEAM_X0 + 1.5 - 50 * K;
  const reach = JACOBS_RIGHT + 10 - seamMid; // wing tip, right of the seam (units)
  let unit = (H * 0.72) / VB.h; // px per monogram unit, then shrunk until the wing fits on narrow screens
  let size = 0;
  let channel = 0;
  for (let i = 0; i < 4; i++) {
    size = Math.max(18, Math.min(44, unit * 7.8)); // about a third of a stroke: faces stay readable
    channel = size * 0.75; // each 7 steps this far away from the split line
    unit = Math.min(unit, (W / 2 - 14 - channel) / reach);
  }
  size = Math.max(18, Math.min(44, unit * 7.8));
  channel = size * 0.75;
  const ox = W / 2 - seamMid * unit;
  const oy = H / 2 - 50 * unit;

  const probe = document.createElement("canvas").getContext("2d")!;
  // Portraits fill the two 7s; the horn and wing are drawn as shapes (as tiles they read as stray squares).
  const paths: Array<[Kind, Path2D]> = [
    ["crown", new Path2D(`M ${MONOGRAM.crownSeven.replace(/ /g, " L ")} Z`)],
    ["jacobs", new Path2D(`M ${MONOGRAM.jacobsSeven.replace(/ /g, " L ")} Z`)],
  ];

  // Rows are shifted along the 62° slant, so the stems become clean slanted columns of prints
  // (brickwork following the stroke) instead of a jagged staircase.
  const found: Array<{ x: number; y: number; kind: Kind }> = [];
  for (let y = oy; y < oy + 100 * unit; y += size) {
    const shift = -((y + size / 2 - oy) * K) % size;
    for (let x = ox - size + shift; x < ox + VB.w * unit; x += size) {
      const hit = paths.find(([, p]) => probe.isPointInPath(p, (x + size / 2 - ox) / unit, (y + size / 2 - oy) / unit));
      if (hit) found.push({ x: x + (hit[0] === "crown" ? -channel : channel), y, kind: hit[0] });
    }
  }

  // Top to bottom, a little jitter so it reads as hands placing photos, not a printer.
  const rand = seeded(1977);
  const order = found.map((c, i) => ({ i, key: c.y + rand() * size * 1.5 })).sort((a, b) => a.key - b.key);
  const crownTiles = shuffled(meta.crown, rand);
  const jacobsTiles = shuffled(meta.jacobs, rand);
  let ci = 0;
  let ji = 0;
  const n = found.length;
  const cells: Cell[] = order.map(({ i }, rank) => {
    const c = found[i];
    return {
      x: c.x,
      y: c.y,
      tile: c.kind === "crown" ? crownTiles[ci++ % meta.crown] : meta.crown + jacobsTiles[ji++ % meta.jacobs],
      // Constant pace: evenly spaced arrivals across the build.
      delay: BUILD_START + (n > 1 ? (rank / (n - 1)) * (BUILD_END - BUILD_START) : 0),
    };
  });
  const top = found.filter((c) => c.y === oy);
  const crownTop = top.filter((c) => c.kind === "crown").map((c) => c.x);
  const jacobsTop = top.filter((c) => c.kind === "jacobs").map((c) => c.x + size);
  const hornX = crownTop.length ? Math.min(...crownTop) : ox + CROWN_LEFT * unit - channel;
  const wingX = jacobsTop.length ? Math.max(...jacobsTop) : ox + JACOBS_RIGHT * unit + channel;
  return { cells, size, at: { oy, unit, hornX, wingX } };
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function HeroMosaic({ src, meta }: { src: string; meta: MosaicMeta }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const root = document.documentElement;
    const sprite = new Image();
    sprite.decoding = "async";
    sprite.src = src;

    let frame = 0;
    let W = 0;
    let H = 0;
    let state = layout(1, 1, meta);
    // Browser-only (Path2D doesn't exist during server rendering).
    const hornPath = new Path2D(MONOGRAM.horn);
    const wingPath = new Path2D(MONOGRAM.wing);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state = layout(W, H, meta);
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
      const border = size > 24 ? 2 : 1.5;
      const inner = size - 2 * border - 2; // 2 px gutter between prints
      const fade = 1 - (1 - FINAL_ALPHA) * easeOut(clamp01((t - RECEDE_START) / (RECEDE_END - RECEDE_START)));
      for (const c of cells) {
        const p = clamp01((t - c.delay) / ARRIVE);
        if (p <= 0) continue;
        const e = easeOut(p);
        // Each print fades in while settling from slightly larger, like being set down.
        const scale = 1 + 0.25 * (1 - e);
        const cx = c.x + size / 2;
        const cy = c.y + size / 2;
        const outer = (inner + 2 * border) * scale;
        ctx.globalAlpha = e * fade;
        ctx.fillStyle = FRAME;
        ctx.fillRect(cx - outer / 2, cy - outer / 2, outer, outer);
        const s = inner * scale;
        ctx.drawImage(sprite, (c.tile % meta.cols) * meta.tile, Math.floor(c.tile / meta.cols) * meta.tile, meta.tile, meta.tile, cx - s / 2, cy - s / 2, s, s);
      }
      // Horn (Crown) and wing (Jacobs), each moving with its own 7, outlined like the prints.
      const { oy, unit, hornX, wingX } = state.at;
      const f = easeOut(clamp01((t - FLOURISH[0]) / (FLOURISH[1] - FLOURISH[0])));
      if (f > 0) {
        ctx.globalAlpha = f * fade;
        ctx.lineJoin = "round";
        for (const [path, color, x] of [[hornPath, HORN, hornX - CROWN_LEFT * unit], [wingPath, WING, wingX - JACOBS_RIGHT * unit]] as const) {
          ctx.save();
          ctx.translate(x, oy);
          ctx.scale(unit, unit);
          ctx.fillStyle = color;
          ctx.fill(path);
          ctx.lineWidth = (size > 24 ? 2 : 1.5) / unit;
          ctx.strokeStyle = FRAME;
          ctx.stroke(path);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    };

    const tick = () => {
      const t = elapsed();
      if (t === null) return draw(Infinity);
      draw(t);
      if (t < RECEDE_END) frame = requestAnimationFrame(tick);
      else draw(Infinity);
    };

    resize();
    sprite.onload = () => tick();
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
