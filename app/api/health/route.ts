import { NextResponse } from "next/server";
import { publicDb } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Uptime check (uptime-worker/): the site answers and the database responds. No data in the reply. */
export async function GET() {
  const db = publicDb();
  if (!db) return NextResponse.json({ ok: false, database: "not configured" }, { status: 503 });
  const { error } = await db.rpc("keepalive");
  if (error) return NextResponse.json({ ok: false, database: "error" }, { status: 503 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
