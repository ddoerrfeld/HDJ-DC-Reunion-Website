import { randomUUID } from "node:crypto";
import convertHeic from "heic-convert";
import sharp, { type OutputInfo } from "sharp";
import { requireServiceDb } from "@/lib/supabase/admin";
import { publicStorageUrl } from "@/lib/supabase/server";

/**
 * Attendee photo pipeline (SPEC §7.1 Step 2, §12.2):
 *  1. createUpload  → signed URL; the browser uploads the original straight to
 *                     private storage (no 4.5 MB serverless body limit).
 *  2. preparePhoto  → verify type by CONTENT (not extension), decode HEIC/HEIF,
 *                     auto-orient, downsize to a 2048 px master, strip ALL
 *                     metadata (incl. GPS); delete the original; return preview.
 *  3. finalizePhoto → apply the user's square crop + rotation, write 512 px WebP,
 *                     160 px WebP and 512 px JPEG (no metadata) to the public
 *                     bucket under an unguessable path.
 */

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const UPLOADS = "photo-uploads";
export const PHOTOS = "attendee-photos";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const PHOTO_PATH = /^p\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class PhotoError extends Error {
  constructor(public readonly userMessage: string) {
    super(userMessage);
  }
}

type ImageKind = "jpeg" | "png" | "webp" | "heic";

/** Identify the file from its first bytes. */
export function sniffImage(bytes: Uint8Array): ImageKind | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp" && ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(ascii(8, 12))) {
    return "heic";
  }
  return null;
}

export function isUploadId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export async function createUpload(): Promise<{ uploadId: string; signedUrl: string }> {
  const db = requireServiceDb();
  const uploadId = randomUUID();
  const { data, error } = await db.storage.from(UPLOADS).createSignedUploadUrl(`${uploadId}/original`);
  if (error || !data) throw new Error(`Could not create upload URL: ${error?.message}`);
  return { uploadId, signedUrl: data.signedUrl };
}

export async function preparePhoto(uploadId: string): Promise<{ previewUrl: string; width: number; height: number }> {
  const db = requireServiceDb();
  const bucket = db.storage.from(UPLOADS);
  const { data: blob, error } = await bucket.download(`${uploadId}/original`);
  if (error || !blob) throw new PhotoError("We couldn’t find your upload. Please try choosing the photo again.");

  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    await bucket.remove([`${uploadId}/original`]);
    throw new PhotoError("That photo is larger than 20 MB. Please choose a smaller one.");
  }
  const kind = sniffImage(bytes);
  if (!kind) {
    await bucket.remove([`${uploadId}/original`]);
    throw new PhotoError("That file isn’t a photo we can use. Please choose a JPEG, PNG, WebP or iPhone (HEIC) photo.");
  }

  let decodable: Buffer = Buffer.from(bytes);
  if (kind === "heic") {
    try {
      decodable = Buffer.from(await convertHeic({ buffer: decodable, format: "JPEG", quality: 0.92 }));
    } catch {
      throw new PhotoError("We couldn’t open that iPhone photo. Please try a different photo.");
    }
  }

  let master: { data: Buffer; info: OutputInfo };
  try {
    master = await sharp(decodable, { failOn: "error", limitInputPixels: 80_000_000 })
      .rotate() // apply EXIF orientation, then the metadata is dropped below
      .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true }) // sharp writes no EXIF/GPS unless asked
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new PhotoError("We couldn’t open that photo. Please try a different one.");
  }

  const { error: upErr } = await bucket.upload(`${uploadId}/master.jpg`, master.data, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (upErr) throw new Error(`Could not store photo: ${upErr.message}`);
  await bucket.remove([`${uploadId}/original`]);

  const { data: signed, error: signErr } = await bucket.createSignedUrl(`${uploadId}/master.jpg`, 60 * 60);
  if (signErr || !signed) throw new Error(`Could not sign preview: ${signErr?.message}`);
  return { previewUrl: signed.signedUrl, width: master.info.width, height: master.info.height };
}

export interface CropPercent {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function finalizePhoto(
  uploadId: string,
  crop: CropPercent,
  rotation: 0 | 90 | 180 | 270,
): Promise<{ photoPath: string; previewUrl: string }> {
  const db = requireServiceDb();
  const uploads = db.storage.from(UPLOADS);
  const { data: blob, error } = await uploads.download(`${uploadId}/master.jpg`);
  if (error || !blob) throw new PhotoError("Your photo upload expired. Please choose the photo again.");

  const rotated = await sharp(Buffer.from(await blob.arrayBuffer())).rotate(rotation).toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = rotated.info;
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  const left = clamp(Math.round((crop.x / 100) * W), 0, W - 1);
  const top = clamp(Math.round((crop.y / 100) * H), 0, H - 1);
  const size = clamp(Math.round(Math.min((crop.width / 100) * W, (crop.height / 100) * H)), 1, Math.min(W - left, H - top));
  const square = sharp(rotated.data).extract({ left, top, width: size, height: size });

  const [webp512, webp160, jpg512] = await Promise.all([
    square.clone().resize(512, 512).webp({ quality: 82 }).toBuffer(),
    square.clone().resize(160, 160).webp({ quality: 80 }).toBuffer(),
    square.clone().resize(512, 512).jpeg({ quality: 85, mozjpeg: true }).toBuffer(),
  ]);

  const photoPath = `p/${randomUUID()}`;
  const photos = db.storage.from(PHOTOS);
  const files: Array<[string, Buffer, string]> = [
    ["512.webp", webp512, "image/webp"],
    ["160.webp", webp160, "image/webp"],
    ["512.jpg", jpg512, "image/jpeg"],
  ];
  for (const [name, data, contentType] of files) {
    const { error: upErr } = await photos.upload(`${photoPath}/${name}`, data, { contentType, cacheControl: "31536000" });
    if (upErr) throw new Error(`Could not store photo: ${upErr.message}`);
  }
  await uploads.remove([`${uploadId}/master.jpg`]);

  return { photoPath, previewUrl: photoUrl(photoPath, 512)! };
}

export function photoUrl(photoPath: string | null, size: 512 | 160 = 512): string | null {
  if (!photoPath || !PHOTO_PATH.test(photoPath)) return null;
  return publicStorageUrl(PHOTOS, `${photoPath}/${size}.webp`);
}

export async function photoExists(photoPath: string): Promise<boolean> {
  if (!PHOTO_PATH.test(photoPath)) return false;
  const { data } = await requireServiceDb().storage.from(PHOTOS).exists(`${photoPath}/512.webp`);
  return data === true;
}

export async function deletePhoto(photoPath: string | null): Promise<void> {
  if (!photoPath || !PHOTO_PATH.test(photoPath)) return;
  await requireServiceDb()
    .storage.from(PHOTOS)
    .remove(["512.webp", "160.webp", "512.jpg"].map((f) => `${photoPath}/${f}`));
}

/** Deletes abandoned uploads (chosen but never finished) older than `hours`. Run daily by cron. */
export async function purgeAbandonedUploads(hours = 24): Promise<number> {
  const bucket = requireServiceDb().storage.from(UPLOADS);
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const { data: folders } = await bucket.list("", { limit: 1000 });
  const stale: string[] = [];
  for (const folder of folders ?? []) {
    if (!UUID.test(folder.name)) continue;
    const { data: files } = await bucket.list(folder.name, { limit: 10 });
    for (const file of files ?? []) {
      if (file.created_at && new Date(file.created_at).getTime() < cutoff) stale.push(`${folder.name}/${file.name}`);
    }
  }
  if (stale.length) await bucket.remove(stale);
  return stale.length;
}
