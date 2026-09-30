import { NextResponse, type NextRequest } from "next/server";
import { purgeAbandonedUploads } from "@/lib/photos";
import { serviceDb } from "@/lib/supabase/admin";
import { publicDb } from "@/lib/supabase/server";

/**
 * Daily Vercel Cron (vercel.json) running one tiny query so a free-tier
 * Supabase project never pauses from inactivity (SPEC §3). Harmless on Pro.
 * Vercel sends "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = publicDb();
  if (!db) return NextResponse.json({ ok: false, reason: "Supabase not configured" }, { status: 503 });
  const { data, error } = await db.rpc("keepalive");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  const purgedUploads = serviceDb() ? await purgeAbandonedUploads().catch(() => -1) : 0;
  return NextResponse.json({ ok: true, databaseTime: data, purgedUploads });
}
