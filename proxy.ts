import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, getGateConfig, isGateExempt, verifyGateToken } from "@/lib/gate";
import { getSiteStage } from "@/lib/site";

// Mirrors lib/rsvp/token.ts (kept separate: that module uses node:crypto).
const RSVP_COOKIE = "c77_rsvp";
const RSVP_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
const EDIT_LINK = /^\/rsvp\/edit\/([A-Za-z0-9_-]{43})$/;

/**
 * Opening a private edit link remembers it on this device, so the yearbooks
 * (section gate) recognize a verified classmate on a new phone or computer.
 * The token is only trusted after a database lookup (lib/yearbook/access.ts).
 */
function rememberEditLink(request: NextRequest, response: NextResponse): NextResponse {
  const token = EDIT_LINK.exec(request.nextUrl.pathname)?.[1];
  if (token && request.cookies.get(RSVP_COOKIE)?.value !== token) {
    response.cookies.set(RSVP_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: RSVP_COOKIE_MAX_AGE,
    });
  }
  return response;
}

/**
 * Stage A site-wide passcode gate (SPEC §12.1). In production the site gate is
 * off; the yearbook section gate is enforced by the pages (lib/yearbook/access.ts).
 */
export async function proxy(request: NextRequest) {
  if (getSiteStage() === "production") return rememberEditLink(request, NextResponse.next());

  const { pathname, search } = request.nextUrl;
  if (isGateExempt(pathname)) return NextResponse.next();

  const config = getGateConfig();
  if (config && (await verifyGateToken(request.cookies.get(GATE_COOKIE)?.value, config))) {
    return rememberEditLink(request, NextResponse.next());
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Passcode required" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url, 307);
}

export const config = {
  // Skip framework assets; everything else is checked in code above.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
