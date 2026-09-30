import { NextResponse, type NextRequest } from "next/server";
import { getSiteStage } from "@/lib/site";
import { PREVIEW_SECTION_GATE_COOKIE } from "@/lib/yearbook/access";

/**
 * Preview only: lets an organizer try the launch-time yearbook gate (the
 * classmate check) on this device. /api/preview/section-gate?on=1 turns it on,
 * ?on=0 turns it off. Behind the site passcode like every preview route.
 */
export function GET(request: NextRequest) {
  if (getSiteStage() === "production") return NextResponse.json({ error: "Not available" }, { status: 404 });
  const on = request.nextUrl.searchParams.get("on") !== "0";
  const response = NextResponse.redirect(new URL("/yearbooks", request.url), 303);
  if (on) response.cookies.set(PREVIEW_SECTION_GATE_COOKIE, "1", { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 });
  else response.cookies.delete(PREVIEW_SECTION_GATE_COOKIE);
  return response;
}
