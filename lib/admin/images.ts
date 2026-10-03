import { randomUUID } from "node:crypto";
import convertHeic from "heic-convert";
import sharp from "sharp";
import { sniffImage } from "@/lib/photos";
import { requireServiceDb } from "@/lib/supabase/admin";

/** Server actions accept up to 4 MB (next.config.ts); Vercel caps request bodies at 4.5 MB. */
export const ADMIN_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

export class AdminImageError extends Error {}

/**
 * Admin photo upload (hotel and In Memoriam photos): checked by content,
 * HEIC decoded, auto-oriented, metadata stripped, resized, stored as WebP in a
 * public bucket under a random name. Returns the storage path, or null when
 * no file was chosen.
 */
export async function storeAdminImage(file: FormDataEntryValue | null, bucket: "lodging" | "memoriam", size: { width: number; height: number }): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > ADMIN_UPLOAD_MAX_BYTES) throw new AdminImageError("That photo is larger than 4 MB. Please choose a smaller one.");
  let bytes: Buffer = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) throw new AdminImageError("That file isn’t a photo we can use. Please choose a JPEG, PNG, WebP or iPhone photo.");
  if (kind === "heic") bytes = Buffer.from(await convertHeic({ buffer: bytes, format: "JPEG", quality: 0.92 }));
  let out: Buffer;
  try {
    out = await sharp(bytes, { failOn: "error", limitInputPixels: 80_000_000 })
      .rotate()
      .resize({ ...size, fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new AdminImageError("We couldn’t open that photo. Please try a different one.");
  }
  const path = `${randomUUID()}.webp`;
  const { error } = await requireServiceDb().storage.from(bucket).upload(path, out, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw new Error(`Could not store photo: ${error.message}`);
  return path;
}

export async function deleteAdminImage(bucket: "lodging" | "memoriam", path: string | null): Promise<void> {
  if (path && /^[0-9a-f-]{36}\.webp$/.test(path)) await requireServiceDb().storage.from(bucket).remove([path]);
}
