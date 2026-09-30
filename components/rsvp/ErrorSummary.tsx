"use client";

import { AlertCircle } from "lucide-react";
import { forwardRef } from "react";

interface ErrorSummaryProps {
  errors: Record<string, string>;
  formError?: string;
}

/** Summary at the top of the step (SPEC §4.5), linking to each field. Receives focus on a failed submit. */
export const ErrorSummary = forwardRef<HTMLDivElement, ErrorSummaryProps>(function ErrorSummary(
  { errors, formError },
  ref,
) {
  const entries = Object.entries(errors);
  if (entries.length === 0 && !formError) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-labelledby="error-summary-title"
      className="rounded-card border-2 border-error bg-paper-raised p-5"
    >
      <h3 id="error-summary-title" className="flex items-center gap-2 text-lead font-bold text-error">
        <AlertCircle size={24} strokeWidth={1.75} aria-hidden="true" />
        {entries.length > 0
          ? `Please fix ${entries.length === 1 ? "this" : `these ${entries.length} things`} to continue`
          : "We couldn’t save your RSVP"}
      </h3>
      {formError ? <p className="mt-2 text-body text-ink">{formError}</p> : null}
      {entries.length > 0 ? (
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-6">
          {entries.map(([field, message]) => (
            <li key={field}>
              <a href={`#${field}`} className="font-semibold text-error">
                {message}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
});
