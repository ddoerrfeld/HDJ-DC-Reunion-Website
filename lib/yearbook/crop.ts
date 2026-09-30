import { z } from "zod";

/** "See Me in ’77" crop: shared by the browser picker and the server. Pure module. */
export const THEN_ASPECT = 4 / 5;

const unit = z.number().min(0).max(1);
export const YearbookCropSchema = z
  .object({ x: unit, y: unit, w: z.number().min(0.02).max(1), h: z.number().min(0.02).max(1) })
  .refine((c) => c.x + c.w <= 1.001 && c.y + c.h <= 1.001, "Crop must stay on the page");
export type YearbookCrop = z.infer<typeof YearbookCropSchema>;

export const YearbookPhotoSchema = z.object({ pageId: z.uuid(), crop: YearbookCropSchema });
export type YearbookPhotoChoice = z.infer<typeof YearbookPhotoSchema>;

export function sameChoice(a: YearbookPhotoChoice | null | undefined, b: YearbookPhotoChoice | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  const k = (c: YearbookCrop) => [c.x, c.y, c.w, c.h].map((v) => v.toFixed(4)).join(",");
  return a.pageId === b.pageId && k(a.crop) === k(b.crop);
}
