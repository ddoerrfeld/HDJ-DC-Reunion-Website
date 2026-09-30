import { NextResponse, type NextRequest } from "next/server";
import { isUploadId, PhotoError, preparePhoto } from "@/lib/photos";

// HEIC decoding of a 12-megapixel iPhone photo can take a few seconds.
export const maxDuration = 60;

/** Step 2: verify, convert (HEIC), orient and strip metadata; returns a preview to crop. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { uploadId?: unknown } | null;
  if (!isUploadId(body?.uploadId)) return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  try {
    return NextResponse.json(await preparePhoto(body.uploadId));
  } catch (error) {
    if (error instanceof PhotoError) return NextResponse.json({ error: error.userMessage }, { status: 422 });
    console.error("[photos/prepare]", error);
    return NextResponse.json({ error: "Something went wrong preparing your photo. Please try again." }, { status: 500 });
  }
}
