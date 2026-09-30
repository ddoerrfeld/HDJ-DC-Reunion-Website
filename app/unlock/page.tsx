import { LockKeyhole } from "lucide-react";
import type { Metadata } from "next";
import { Monogram77 } from "@/components/brand/Monogram77";
import { SeamBand, SeamRule } from "@/components/brand/Seam";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { getGateConfig, safeNextPath, type UnlockError } from "@/lib/gate";

export const metadata: Metadata = { title: "Enter the class passcode" };

const MESSAGES: Record<UnlockError, string> = {
  empty: "Please enter the class passcode.",
  wrong: "That passcode didn’t match. Please check it and try again.",
  locked: "Too many tries from this connection. Please wait 15 minutes and try again.",
  config: "The site isn’t ready yet — its passcode hasn’t been set up. Please contact the reunion committee.",
};

function isUnlockError(value: string | undefined): value is UnlockError {
  return value !== undefined && value in MESSAGES;
}

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const configured = getGateConfig() !== null;
  const error: UnlockError | undefined = !configured ? "config" : isUnlockError(params.error) ? params.error : undefined;
  const fieldError = error && error !== "config" ? MESSAGES[error] : undefined;

  return (
    <div className="flex min-h-svh flex-col">
      <SeamBand height={10} />
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center gap-4 text-center">
            <Monogram77 height={104} title="Class of ’77 monogram" />
            <h1 className="type-display text-h1 text-ink">Class of ’77</h1>
            <p className="text-lead text-ink">
              50-Year Reunion
              <span className="block text-body text-muted">Irving Crown &amp; Harry D. Jacobs High Schools</span>
            </p>
            <SeamRule className="w-full max-w-60" />
          </div>

          <div className="card mt-8 p-6 md:p-8">
            {error === "config" ? (
              <p className="flex items-start gap-3 text-body font-semibold text-error" role="alert">
                <LockKeyhole size={24} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
                {MESSAGES.config}
              </p>
            ) : (
              <form action="/api/unlock" method="post" className="flex flex-col gap-6">
                <input type="hidden" name="next" value={next} />
                <TextField
                  id="passcode"
                  name="passcode"
                  label="Class passcode"
                  hint="Ask the reunion committee for it. You’ll only need to enter it once on this device."
                  error={fieldError}
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
                <Button type="submit" variant="primary" fullWidth>
                  Open the reunion site
                </Button>
              </form>
            )}
          </div>
          <p className="mt-6 text-center text-small text-muted">
            This preview is private while the site is being built.
          </p>
        </div>
      </main>
    </div>
  );
}
