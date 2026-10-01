import { verifyClassmateAction } from "@/app/(site)/yearbooks/actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

export const VERIFY_MESSAGES: Record<string, string> = {
  missing: "Please enter both your first name and your last name from 1977.",
  nomatch:
    "We couldn’t find that name among the 1977 seniors. Try the first and last name you used in high school — or RSVP, and the organizer will confirm you by hand.",
  limit: "Too many tries from this device. Please wait an hour, or email the organizer.",
};

/**
 * The launch-time section gate (SPEC §12.1 Stage B, owner-revised): yearbooks and
 * Who’s Coming are for classmates, confirmed by their 1977 name. `back` is the page
 * that shows this form; `next` is where a match goes.
 */
export function ClassmateCheck({
  error,
  next,
  back,
  reason,
  submitLabel,
}: {
  error?: string;
  next: string;
  back: "/yearbooks" | "/whos-coming";
  reason: string;
  submitLabel: string;
}) {
  return (
    <section aria-labelledby="classmate-check" className="mt-10 max-w-2xl rounded-card border-2 border-line bg-paper-raised p-6 shadow-card sm:p-8">
      <h2 id="classmate-check" className="text-h2 text-ink">
        Confirm you’re a classmate
      </h2>
      <p className="mt-2 text-body text-ink">
        {reason} Enter your name as it was in 1977. If you’ve already RSVP’d, your private RSVP link lets you in too.
      </p>
      {error ? (
        <p role="alert" className="mt-4 rounded-card border-l-4 border-jacobs-brown bg-jacobs-gold/25 p-4 font-semibold text-ink">
          {error}
        </p>
      ) : null}
      <form action={verifyClassmateAction} className="mt-6 flex flex-col gap-5">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="back" value={back} />
        <TextField id="verify-first" name="firstName" label="First name" autoComplete="given-name" required />
        <TextField id="verify-last" name="lastName" label="Last name in 1977" hint="Your maiden name, if it has changed." autoComplete="family-name" required />
        <div>
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </section>
  );
}
