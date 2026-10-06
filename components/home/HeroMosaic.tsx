"use client";

import { useEffect, useRef } from "react";
import { MONOGRAM } from "@/components/brand/monogram-geometry";

/**
 * Portrait mosaic for the home hero (owner request): small 1977 senior portraits,
 * tinted in each school's colors, fly in one after another at a steady pace from
 * scattered spots on their own school's side and land in random order until they
 * form the “77” — horn and wing included (faces repeat where needed). The full 77
 * holds for a moment, then recedes to a faint watermark as the headline arrives.
 * Decorative (aria-hidden).
 *
 * Both 7s use the same tile pattern (same size) and stand apart from the hero's
 * split line, with a clear channel along it. Timing follows the hero's CSS timeline (it starts at first paint, before
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
const BUILD_START = 700; // first portrait sets off
const BUILD_END = 4600; // last portrait sets off; evenly spaced between (constant pace)
const ARRIVE = 1100; // each portrait's flight from its scattered spot
const RECEDE_START = 6600;
const RECEDE_END = 7400;
const FINAL_ALPHA = 0.26; // watermark behind the headline
const FRAME = "#F7F1E3"; // paper-colored print border, sets the 77 apart from the background

type Kind = "crown" | "jacobs";
interface Cell {
  x: number; // final top-left, CSS px
  y: number;
  tile: number; // sprite index (crown first, then jacobs)
  delay: number;
  sx: number; // scattered start (top-left), CSS px
  sy: number;
  rot: number; // starting tilt, radians
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

// Anchors in monogram units: the 7s' top-left corners and the Jacobs 7's top-right corner.
const CROWN_LEFT = Number(MONOGRAM.crownSeven.split(",")[0]);
const JACOBS_RIGHT = Number(MONOGRAM.jacobsSeven.split(" ")[1].split(",")[0]);
const JACOBS_LEFT = Number(MONOGRAM.jacobsSeven.split(",")[0]);

function layout(W: number, H: number, meta: MosaicMeta): { cells: Cell[]; size: number } {
  // Monogram seam centerline at mid-height (y = 50) → hero center, so both 7s run parallel to the split.
  const seamMid = SEAM_X0 + 1.5 - 50 * K;
  const reach = JACOBS_RIGHT + 10 - seamMid; // wing tip, right of the seam (units)
  let unit = (H * 0.72) / VB.h; // px per monogram unit, then shrunk until the wing fits on narrow screens
  let size = 0;
  let channel = 0;
  for (let i = 0; i < 4; i++) {
    size = Math.max(10, Math.min(24, unit * 4.3)); // small prints, many of them
    channel = Math.max(18, size * 1.6); // each 7 steps this far away from the split line
    unit = Math.min(unit, (W / 2 - 14 - channel) / reach);
  }
  size = Math.max(10, Math.min(24, unit * 4.3));
  channel = Math.max(18, size * 1.6);
  const ox = W / 2 - seamMid * unit;
  const oy = H / 2 - 50 * unit;

  const probe = document.createElement("canvas").getContext("2d")!;
  const jacobsBody = new Path2D(`M ${MONOGRAM.jacobsSeven.replace(/ /g, " L ")} Z`);
  const horn = new Path2D(MONOGRAM.horn);
  const wing = new Path2D(MONOGRAM.wing);
  // The Crown 7 is the Jacobs 7's pattern moved left, so both 7s are exactly the same size.
  const crownShift = (CROWN_LEFT - JACOBS_LEFT) * unit - 2 * channel;
  const inside = (p: Path2D, x: number, y: number) => probe.isPointInPath(p, (x + size / 2 - ox) / unit, (y + size / 2 - oy) / unit);

  // Rows are shifted along the 62° slant, so the stems become clean slanted columns of prints.
  const found: Array<{ x: number; y: number; kind: Kind }> = [];
  for (let y = oy + VB.y * unit; y < oy + 100 * unit; y += size) {
    const shift = -((y + size / 2 - oy) * K) % size;
    for (let x = ox - size + shift; x < ox + VB.w * unit; x += size) {
      if (inside(jacobsBody, x, y)) {
        found.push({ x: x + channel, y, kind: "jacobs" });
        found.push({ x: x + channel + crownShift, y, kind: "crown" });
      } else if (inside(wing, x, y)) {
        found.push({ x: x + channel, y, kind: "jacobs" });
      }
    }
  }
  // Horn: its own grid pass at the Crown 7's position (the horn sits on the Crown 7's top-left corner).
  for (let y = oy + VB.y * unit; y < oy; y += size) {
    const shift = -((y + size / 2 - oy) * K) % size;
    for (let x = ox - size + shift; x < ox + VB.w * unit; x += size) {
      if (inside(horn, x, y)) found.push({ x: x - channel, y, kind: "crown" });
    }
  }

  // Random order, steady pace; each print flies in from a scattered spot on its own school's side.
  const rand = seeded(1977);
  const order = shuffled(found.length, rand);
  const crownTiles = shuffled(meta.crown, rand);
  const jacobsTiles = shuffled(meta.jacobs, rand);
  let ci = 0;
  let ji = 0;
  const n = found.length;
  const cells: Cell[] = order.map((i, rank) => {
    const c = found[i];
    const crown = c.kind === "crown";
    return {
      x: c.x,
      y: c.y,
      // Faces repeat when the 7s need more prints than there are portraits.
      tile: crown ? crownTiles[ci++ % meta.crown] : meta.crown + jacobsTiles[ji++ % meta.jacobs],
      delay: BUILD_START + (n > 1 ? (rank / (n - 1)) * (BUILD_END - BUILD_START) : 0),
      sx: crown ? rand() * 0.48 * W : W * 0.52 + rand() * 0.48 * W,
      sy: rand() * H,
      rot: (rand() - 0.5) * 1.2,
    };
  });
  return { cells, size };
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
      const border = size > 16 ? 1.5 : 1;
      const inner = size - 2 * border - 1; // 1 px gutter between prints
      const fade = 1 - (1 - FINAL_ALPHA) * easeOut(clamp01((t - RECEDE_START) / (RECEDE_END - RECEDE_START)));
      const dpr = canvas.width / Math.max(1, W);
      for (const c of cells) {
        const p = clamp01((t - c.delay) / ARRIVE);
        if (p <= 0) continue;
        const e = easeOut(p);
        const x = c.sx + (c.x - c.sx) * e + size / 2;
        const y = c.sy + (c.y - c.sy) * e + size / 2;
        const a = c.rot * (1 - e);
        const scale = 1 + 0.6 * (1 - e);
        const cos = Math.cos(a) * dpr;
        const sin = Math.sin(a) * dpr;
        ctx.setTransform(cos, sin, -sin, cos, x * dpr, y * dpr);
        ctx.globalAlpha = Math.min(1, p * 3) * fade;
        const outer = (inner + 2 * border) * scale;
        ctx.fillStyle = FRAME;
        ctx.fillRect(-outer / 2, -outer / 2, outer, outer);
        const s = inner * scale;
        ctx.drawImage(sprite, (c.tile % meta.cols) * meta.tile, Math.floor(c.tile / meta.cols) * meta.tile, meta.tile, meta.tile, -s / 2, -s / 2, s, s);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
