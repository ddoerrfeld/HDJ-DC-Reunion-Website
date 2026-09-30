import { AlertCircle, Check } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

/**
 * Form primitives (SPEC §4.5): always a visible <label>, help text tied with
 * aria-describedby, errors in plain words next to the field.
 */

interface TextFieldProps extends Omit<ComponentProps<"input">, "id" | "className"> {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
}

export function TextField({ id, label, hint, error, optional, ...input }: TextFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body font-semibold text-ink">
        {label}
        {optional ? <span className="font-normal text-muted"> (optional)</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="text-small text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-start gap-2 text-body font-semibold text-error">
          <AlertCircle size={22} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
      <input
        id={id}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        aria-invalid={error ? true : undefined}
        className={`min-h-14 w-full rounded-card border-2 bg-paper-raised px-4 py-3 text-body text-ink transition-colors duration-[var(--dur-ui)] ${
          error ? "border-error" : "border-line-strong"
        }`}
        {...input}
      />
    </div>
  );
}

interface ChoiceCardProps extends Omit<ComponentProps<"input">, "type" | "className" | "children"> {
  type: "radio" | "checkbox";
  label: string;
  description?: ReactNode;
  meta?: ReactNode;
}

/**
 * Large radio/checkbox card built on a real native input (keyboard, forms and
 * screen readers work for free); the indicator is custom (SPEC §4.7).
 */
export function ChoiceCard({ type, label, description, meta, ...input }: ChoiceCardProps) {
  const round = type === "radio";
  return (
    <label className="group relative flex min-h-14 cursor-pointer items-start gap-4 rounded-card border-2 border-line-strong bg-paper-raised p-4 transition-colors duration-[var(--dur-ui)] hover:border-ink has-checked:border-crown-blue-deep has-checked:bg-crown-tint has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-seam-gold">
      <input type={type} className="peer absolute size-px opacity-0" {...input} />
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center border-2 border-line-strong bg-white text-white transition-colors duration-[var(--dur-ui)] peer-checked:border-crown-blue-deep peer-checked:bg-crown-blue-deep ${
          round ? "rounded-pill" : "rounded-sm"
        }`}
      >
        {round ? (
          <span className="size-2.5 rounded-pill bg-white opacity-0 group-has-checked:opacity-100" />
        ) : (
          <Check size={20} strokeWidth={3} className="opacity-0 group-has-checked:opacity-100" />
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-body font-semibold text-ink">{label}</span>
        {description ? <span className="text-small text-muted">{description}</span> : null}
        {meta ? <span className="mt-1 flex flex-wrap gap-2">{meta}</span> : null}
      </span>
    </label>
  );
}

interface SplitPillProps {
  name: string;
  legend: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
}

/**
 * Segmented control whose dividers are 62° seams — the directory school filter
 * (SPEC §4.1). Native radios inside a fieldset.
 */
export function SplitPill({ name, legend, options, defaultValue }: SplitPillProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-body font-semibold text-ink">{legend}</legend>
      <div className="inline-flex overflow-hidden rounded-pill border-2 border-ink bg-paper-raised">
        {options.map((option, index) => (
          <label
            key={option.value}
            className="relative flex min-h-12 cursor-pointer items-center px-5 text-body font-semibold text-ink transition-colors duration-[var(--dur-ui)] has-checked:bg-ink has-checked:text-white has-focus-visible:z-10 has-focus-visible:outline-3 has-focus-visible:-outline-offset-4 has-focus-visible:outline-seam-gold"
          >
            {index > 0 ? (
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 skew-x-[-28deg] bg-seam-gold"
              />
            ) : null}
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={option.value === defaultValue}
              className="absolute size-px opacity-0"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
