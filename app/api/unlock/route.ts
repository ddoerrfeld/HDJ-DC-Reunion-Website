import { NextResponse, type NextRequest } from "next/server";
import {
  GATE_COOKIE,
  GATE_MAX_AGE_SECONDS,
  createGateToken,
  getGateConfig,
  passcodeMatches,
  safeNextPath,
  type UnlockError,
} from "@/lib/gate";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const MAX_ATTEMPTS = 10;
const WINDOW_SECONDS = 15 * 60;
const FAILURE_DELAY_MS = 400;

function backToGate(request: NextRequest, error: UnlockError, next: string) {
  const url = new URL("/unlock", request.url);
  url.searchParams.set("error", error);
  if (next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url, 303);
}

/** Plain HTML form POST so the gate works with JavaScript disabled. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const passcode = String(form.get("passcode") ?? "");
  const next = safeNextPath(String(form.get("next") ?? ""));

  const config = getGateConfig();
  if (!config) return backToGate(request, "config", next);

  if (passcode.trim() === "") return backToGate(request, "empty", next);
  if (!(await rateLimit(`unlock:${clientKey(request.headers)}`, MAX_ATTEMPTS, WINDOW_SECONDS))) {
    return backToGate(request, "locked", next);
  }

  if (!(await passcodeMatches(passcode, config))) {
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
    return backToGate(request, "wrong", next);
  }

  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(GATE_COOKIE, await createGateToken(config), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GATE_MAX_AGE_SECONDS,
  });
  return response;
}
