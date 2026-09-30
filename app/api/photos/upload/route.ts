import { NextResponse, type NextRequest } from "next/server";
import { createUpload } from "@/lib/photos";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/** Step 1 of the photo pipeline: a one-time signed URL for a direct-to-storage upload. */
export async function POST(request: NextRequest) {
  if (!(await rateLimit(`photo:${clientKey(request.headers)}`, 30, 60 * 60))) {
    return NextResponse.json({ error: "Too many uploads. Please wait a little and try again." }, { status: 429 });
  }
  try {
    return NextResponse.json(await createUpload());
  } catch (error) {
    console.error("[photos/upload]", error);
    return NextResponse.json({ error: "Photo uploads aren’t available right now. You can skip this step." }, { status: 503 });
  }
}
