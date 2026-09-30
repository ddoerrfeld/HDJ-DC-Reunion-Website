/**
 * Yearbook ingest (SPEC §10.2). Reads the owner's scans from the private yearbook
 * repo and writes everything the site needs into .yearbook-build/ (gitignored):
 *
 *   assets/<school>/<seq>-<hash>/t.webp   240 px thumbnail
 *   assets/<school>/<seq>-<hash>/d.webp   display/zoom, native width (scans are 1100 px;
 *                                          upscaling adds bytes, not detail)
 *   assets/<school>/<seq>-<hash>/d.jpg    JPEG fallback for old iPads
 *   ocr/<school>-<seq>.txt                Tesseract text (with --ocr)
 *   manifest.json, yearbook.sql           page rows for the yearbook_pages table
 *
 * The content hash in each path means a re-scanned page gets a new URL, so the
 * image CDN can cache everything for a year. Metadata is stripped from every output.
 * Idempotent: pages whose outputs exist are skipped unless --force.
 *
 *   node scripts/ingest-yearbook.mts [--src ../crownjacobs77-yearbooks] [--ocr] [--force]
 */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { YEARBOOK_BOOKS_SEED, type YearbookSchool } from "../lib/content/yearbook-seed.ts";

const run = promisify(execFile);
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const SRC = option("src", process.env.YEARBOOK_SRC ?? "../crownjacobs77-yearbooks");
const OUT = option("out", ".yearbook-build");
const FORCE = flag("force");
const OCR = flag("ocr");
const CONCURRENCY = 4;

export interface ManifestPage {
  school: YearbookSchool;
  seq: number;
  dir: string; // "<school>/<seq>-<hash>"
  width: number;
  height: number;
  hidden: boolean;
  ocrText: string | null;
}

async function ocr(input: Buffer, target: string): Promise<string> {
  if (existsSync(target) && !FORCE) return readFile(target, "utf8");
  // Tesseract reads 1970s halftone type far better at 2× in greyscale. Sparse-text
  // mode (psm 11) finds the short name captions under portraits that page mode misses.
  // One thread per process: the pool already runs CONCURRENCY in parallel, and
  // tesseract's own threading makes parallel runs ~40× slower.
  const tmp = `${target}.png`;
  await sharp(input).greyscale().resize({ width: 2200 }).png().toFile(tmp);
  const { stdout } = await run("tesseract", [tmp, "-", "--psm", "11"], {
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, OMP_THREAD_LIMIT: "1" },
  });
  await run("rm", ["-f", tmp]);
  const text = stdout.replace(/[^\S\n]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  await writeFile(target, text);
  return text;
}

async function ingestPage(school: YearbookSchool, seq: number, file: string, hidden: boolean): Promise<ManifestPage> {
  const input = await readFile(file);
  const hash = createHash("sha256").update(input).digest("hex").slice(0, 10);
  const dir = `${school}/${String(seq).padStart(3, "0")}-${hash}`;
  const target = join(OUT, "assets", dir);
  await mkdir(target, { recursive: true });

  // .rotate() applies EXIF orientation; sharp writes no metadata unless asked.
  const base = sharp(input).rotate();
  const { width, height } = await base.clone().metadata();
  if (!width || !height) throw new Error(`${file}: unreadable image`);
  const outputs: [string, () => Promise<unknown>][] = [
    ["t.webp", () => base.clone().resize({ width: 240 }).webp({ quality: 72 }).toFile(join(target, "t.webp"))],
    ["d.webp", () => base.clone().webp({ quality: 82 }).toFile(join(target, "d.webp"))],
    ["d.jpg", () => base.clone().jpeg({ quality: 84, mozjpeg: true }).toFile(join(target, "d.jpg"))],
  ];
  for (const [name, make] of outputs) {
    if (FORCE || !existsSync(join(target, name))) await make();
  }

  const ocrText = OCR && !hidden ? await ocr(input, join(OUT, "ocr", `${school}-${seq}.txt`)) : null;
  return { school, seq, dir, width, height, hidden, ocrText };
}

async function pool<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

const lit = (v: string | number | boolean | null): string =>
  v === null ? "null" : typeof v === "string" ? `'${v.replace(/'/g, "''")}'` : String(v);

async function main() {
  await mkdir(join(OUT, "ocr"), { recursive: true });
  const pages: ManifestPage[] = [];
  for (const book of YEARBOOK_BOOKS_SEED) {
    const folder = join(SRC, book.dir);
    const files = (await readdir(folder)).filter((f) => /\.(jpe?g|png|tiff?|webp)$/i.test(f)).sort();
    if (files.length === 0) throw new Error(`${folder}: no images`);
    console.log(`${book.school}: ${files.length} pages${OCR ? " (with OCR)" : ""}`);
    const done = await pool(files.map((f, i) => ({ f, seq: i + 1 })), ({ f, seq }) =>
      ingestPage(book.school, seq, join(folder, f), book.hiddenSeqs.includes(seq)),
    );
    pages.push(...done);
  }

  await writeFile(join(OUT, "manifest.json"), JSON.stringify(pages, null, 1));

  // Upsert by (school, seq): re-running updates URLs/OCR but keeps admin-edited labels.
  const rows = pages.map((p) =>
    `(${[p.school, p.seq, `${p.dir}/t.webp`, `${p.dir}/d.webp`, `${p.dir}/d.jpg`, `${p.dir}/d.webp`, p.width, p.height, p.hidden, p.ocrText]
      .map(lit)
      .join(", ")})`,
  );
  const sql = `-- Generated by scripts/ingest-yearbook.mts. Contains no images, only paths and OCR text.
insert into public.yearbook_pages (school, seq, thumb_url, display_url, display_jpg_url, zoom_url, width, height, hidden, ocr_text)
values
${rows.join(",\n")}
on conflict (school, seq) do update set
  thumb_url = excluded.thumb_url, display_url = excluded.display_url,
  display_jpg_url = excluded.display_jpg_url, zoom_url = excluded.zoom_url,
  width = excluded.width, height = excluded.height,
  ocr_text = coalesce(excluded.ocr_text, public.yearbook_pages.ocr_text);
`;
  await writeFile(join(OUT, "yearbook.sql"), sql);
  console.log(`wrote ${pages.length} pages → ${OUT}/manifest.json, ${OUT}/yearbook.sql`);
}

await main();
