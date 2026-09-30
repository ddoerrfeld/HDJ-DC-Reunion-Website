import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, getGateConfig, isGateExempt, verifyGateToken } from "@/lib/gate";
import { getSiteStage } from "@/lib/site";

/**
 * Stage A site-wide passcode gate (SPEC §12.1). In production the gate is off;
 * the Stage B section gate arrives in Phase 6.
 */
export async function proxy(request: NextRequest) {
  if (getSiteStage() === "production") return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (isGateExempt(pathname)) return NextResponse.next();

  const config = getGateConfig();
  if (config && (await verifyGateToken(request.cookies.get(GATE_COOKIE)?.value, config))) {
    return NextResponse.next();
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
