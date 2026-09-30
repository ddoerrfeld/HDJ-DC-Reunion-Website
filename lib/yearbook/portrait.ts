import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { publicStorageUrl } from "@/lib/supabase/server";
import { requireServiceDb } from "@/lib/supabase/admin";
import { THEN_ASPECT, type YearbookPhotoChoice } from "./crop";
import { signedYearbookUrl } from "./sign";

/**
 * "See Me in ’77" (SPEC §10.4): the attendee picks a page and a crop box around
 * their own senior portrait; the server renders the crop from the yearbook asset
 * (never a user upload). Output is 4:5 like a yearbook portrait.
 */
const BUCKET = "attendee-photos";
export const THEN_PATH = /^t\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function thenPhotoUrl(path: string | null, size: 512 | 160 = 512): string | null {
  if (!path || !THEN_PATH.test(path)) return null;
  return publicStorageUrl(BUCKET, `${path}/${size}.webp`);
}

export async function deleteThenPhoto(path: string | null): Promise<void> {
  if (!path || !THEN_PATH.test(path)) return;
  await requireServiceDb()
    .storage.from(BUCKET)
    .remove(["512.webp", "160.webp", "512.jpg"].map((f) => `${path}/${f}`));
}

/** Renders and stores the "then" portrait; returns its storage path. Throws if the page doesn't exist or is hidden. */
export async function renderThenPhoto(choice: YearbookPhotoChoice): Promise<string> {
  const db = requireServiceDb();
  const { data: page, error } = await db
    .from("yearbook_pages")
    .select("zoom_url, width, height, hidden")
    .eq("id", choice.pageId)
    .maybeSingle();
  if (error || !page || page.hidden) throw new Error("That yearbook page isn’t available.");

  const response = await fetch(signedYearbookUrl(page.zoom_url));
  if (!response.ok) throw new Error(`Yearbook image fetch failed (${response.status})`);
  const source = Buffer.from(await response.arrayBuffer());
  const { width: W = page.width, height: H = page.height } = await sharp(source).metadata();

  // Enforce 4:5 around the chosen centre, whatever the client sent.
  const { crop } = choice;
  let w = Math.max(8, Math.round(crop.w * W));
  let h = Math.round(w / THEN_ASPECT);
  if (h > H) {
    h = H;
    w = Math.round(h * THEN_ASPECT);
  }
  const cx = (crop.x + crop.w / 2) * W;
  const cy = (crop.y + crop.h / 2) * H;
  const left = Math.min(Math.max(0, Math.round(cx - w / 2)), W - w);
  const top = Math.min(Math.max(0, Math.round(cy - h / 2)), H - h);
  const region = sharp(source).extract({ left, top, width: w, height: h });

  const [webp512, webp160, jpg512] = await Promise.all([
    region.clone().resize(512, 640, { kernel: "lanczos3" }).webp({ quality: 84 }).toBuffer(),
    region.clone().resize(160, 200).webp({ quality: 80 }).toBuffer(),
    region.clone().resize(512, 640, { kernel: "lanczos3" }).jpeg({ quality: 86, mozjpeg: true }).toBuffer(),
  ]);
  const path = `t/${randomUUID()}`;
  const bucket = db.storage.from(BUCKET);
  for (const [name, data, contentType] of [
    ["512.webp", webp512, "image/webp"],
    ["160.webp", webp160, "image/webp"],
    ["512.jpg", jpg512, "image/jpeg"],
  ] as const) {
    const { error: upErr } = await bucket.upload(`${path}/${name}`, data, { contentType, cacheControl: "31536000" });
    if (upErr) throw new Error(`Could not store the yearbook photo: ${upErr.message}`);
  }
  return path;
}
