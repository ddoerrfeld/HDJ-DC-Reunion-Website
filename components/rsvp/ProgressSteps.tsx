import { Check } from "lucide-react";

/** Step names with a progress bar (SPEC §7.1). Completed steps can be revisited. */
export function ProgressSteps({
  steps,
  current,
  onGoTo,
  furthest,
}: {
  steps: readonly string[];
  current: number;
  furthest: number;
  onGoTo: (index: number) => void;
}) {
  return (
    <nav aria-label="RSVP progress">
      <p className="mb-3 text-body font-semibold text-ink">
        Step {current + 1} of {steps.length}: {steps[current]}
      </p>
      <div className="h-2 overflow-hidden rounded-pill bg-paper-sunk" aria-hidden="true">
        <div
          className="h-full rounded-pill bg-crown-blue-deep transition-[width] duration-[var(--dur-enter)]"
          style={{ width: `${((current + 1) / steps.length) * 100}%` }}
        />
      </div>
      <ol className="mt-4 hidden gap-2 md:flex">
        {steps.map((label, index) => {
          const done = index < current;
          const reachable = index <= furthest && index !== current;
          const content = (
            <>
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-pill border-2 text-small font-bold ${
                  index === current
                    ? "border-crown-blue-deep bg-crown-blue-deep text-white"
                    : done
                      ? "border-crown-blue-deep text-crown-blue-deep"
                      : "border-line-strong text-muted"
                }`}
              >
                {done ? <Check size={16} strokeWidth={3} aria-hidden="true" /> : index + 1}
              </span>
              <span className={index === current ? "font-bold text-ink" : "text-muted"}>{label}</span>
            </>
          );
          return (
            <li key={label} className="flex-1" aria-current={index === current ? "step" : undefined}>
              {reachable ? (
                <button
                  type="button"
                  onClick={() => onGoTo(index)}
                  className="flex min-h-12 w-full items-center gap-2 rounded-sm text-left text-small"
                >
                  {content}
                  <span className="visually-hidden"> (go to this step)</span>
                </button>
              ) : (
                <span className="flex min-h-12 items-center gap-2 text-small">{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
