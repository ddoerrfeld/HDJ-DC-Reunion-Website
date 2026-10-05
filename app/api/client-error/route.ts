import { NextResponse, type NextRequest } from "next/server";
import { reportError } from "@/lib/monitoring";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/** Receives browser error reports (lib/client-report.ts). Small, rate-limited, never echoes anything back. */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > 8_000) return new NextResponse(null, { status: 413 });
  if (!(await rateLimit(`client-error:${clientKey(request.headers)}`, 10, 10 * 60))) return new NextResponse(null, { status: 204 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  const message = str(b.message);
  if (!message) return new NextResponse(null, { status: 400 });
  await reportError({ source: "client", message, detail: str(b.detail), path: str(b.path), route: request.headers.get("user-agent")?.slice(0, 200) ?? null });
  return new NextResponse(null, { status: 204 });
}
