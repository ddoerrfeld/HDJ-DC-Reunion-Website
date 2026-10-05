"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Monogram77 } from "@/components/brand/Monogram77";
import { SeamRule } from "@/components/brand/Seam";
import { Button, ButtonLink } from "@/components/ui/Button";
import { reportClientError } from "@/lib/client-report";

/**
 * Designed fallback for an unexpected error inside a page (error.tsx). Server
 * errors are already recorded by instrumentation.ts; errors raised in the
 * browser are reported from here.
 */
export function ErrorPanel({ error, retry, homeHref = "/" }: { error: Error & { digest?: string }; retry: () => void; homeHref?: string }) {
  useEffect(() => {
    if (!error.digest) reportClientError(error.message || "Render error", error.stack ?? null);
  }, [error]);
  return (
    <div role="alert" className="container-page flex flex-col items-center gap-6 py-20 text-center md:py-28">
      <Monogram77 height={96} />
      <p className="type-eyebrow text-crown-blue-deep">Something went wrong</p>
      <h1 className="max-w-[20ch] text-h1 text-ink md:text-display">This page didn’t load properly</h1>
      <SeamRule className="w-full max-w-60" />
      <p className="measure text-lead text-ink">
        It’s not you — the organizers have been told automatically. Please try again in a moment. Anything you already saved is safe.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => retry()} icon={<RotateCcw size={20} strokeWidth={1.75} aria-hidden="true" />}>
          Try again
        </Button>
        <ButtonLink href={homeHref} variant="secondary">
          {homeHref === "/" ? "Go to the home page" : "Back to the dashboard"}
        </ButtonLink>
      </div>
      {error.digest ? <p className="text-small text-muted">Reference: {error.digest}</p> : null}
    </div>
  );
}
