import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

/**
 * On-demand refresh of every public page after a database change. Pages also
 * refresh on their own within 60 s; this makes it immediate. Called by admin
 * actions (Phase 7), tests, and optionally a Supabase database webhook.
 * Authorization: Bearer <REVALIDATE_SECRET>. Disabled when the secret is unset.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || secret.length < 16) return new NextResponse(null, { status: 404 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ revalidated: true, at: new Date().toISOString() });
}
