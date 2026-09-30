import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { finalizePhoto, isUploadId, PhotoError } from "@/lib/photos";

export const maxDuration = 60;

const pct = z.number().min(0).max(100);
const Body = z.object({
  uploadId: z.string().refine(isUploadId),
  crop: z.object({ x: pct, y: pct, width: pct.gt(0), height: pct.gt(0) }),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
});

/** Step 3: apply the square crop + rotation and publish the EXIF-free sizes. */
export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid crop." }, { status: 400 });
  try {
    const { uploadId, crop, rotation } = parsed.data;
    return NextResponse.json(await finalizePhoto(uploadId, crop, rotation));
  } catch (error) {
    if (error instanceof PhotoError) return NextResponse.json({ error: error.userMessage }, { status: 422 });
    console.error("[photos/finalize]", error);
    return NextResponse.json({ error: "Something went wrong saving your photo. Please try again." }, { status: 500 });
  }
}
