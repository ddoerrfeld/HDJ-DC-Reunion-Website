import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

/** Building blocks for the organizer pages: same tokens, type and 48 px targets as the public site. */

export function AdminHeader({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-h2 text-ink md:text-h1">{title}</h1>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      {children ? <div className="measure text-body text-muted">{children}</div> : null}
    </header>
  );
}

const NOTICES: Record<string, string> = {
  saved: "Saved. The public site shows the change within a minute — reload the page if you don’t see it yet.",
  created: "Added.",
  deleted: "Deleted.",
  sent: "Email sent.",
  approved: "Approved — they’ve been emailed.",
};

/** Result of the last action (from ?ok= / ?error= in the URL). */
export function Notice({ ok, error }: { ok?: string; error?: string }) {
  if (error) {
    return (
      <p role="alert" className="flex items-start gap-3 rounded-card border-2 border-error bg-paper-raised p-4 text-body font-semibold text-error">
        <AlertCircle size={24} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
        {error}
      </p>
    );
  }
  if (!ok) return null;
  return (
    <p role="status" className="flex items-start gap-3 rounded-card border-2 border-crown-blue-deep bg-crown-tint p-4 text-body font-semibold text-ink">
      <CheckCircle2 size={24} strokeWidth={1.75} className="mt-0.5 shrink-0 text-crown-blue-deep" aria-hidden="true" />
      {NOTICES[ok] ?? ok}
    </p>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card flex flex-col gap-1 p-5">
      <dt className="text-body font-semibold text-muted">{label}</dt>
      <dd className="font-display text-h1 leading-none text-ink">{value}</dd>
      {sub ? <dd className="text-small text-muted">{sub}</dd> : null}
    </div>
  );
}

const control = "w-full rounded-card border-2 border-line-strong bg-paper-raised px-4 py-3 text-body text-ink";

export function TextAreaField({ id, label, hint, rows = 6, ...rest }: Omit<ComponentProps<"textarea">, "id" | "className"> & { id: string; label: string; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body font-semibold text-ink">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-small text-muted">
          {hint}
        </p>
      ) : null}
      <textarea id={id} rows={rows} aria-describedby={hint ? `${id}-hint` : undefined} className={`${control} min-h-28 font-sans`} {...rest} />
    </div>
  );
}

export function SelectField({
  id,
  label,
  hint,
  options,
  ...rest
}: Omit<ComponentProps<"select">, "id" | "className" | "children"> & { id: string; label: string; hint?: ReactNode; options: Array<{ value: string; label: string }> }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body font-semibold text-ink">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-small text-muted">
          {hint}
        </p>
      ) : null}
      <select id={id} aria-describedby={hint ? `${id}-hint` : undefined} className={`${control} min-h-14`} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CheckboxField({ label, hint, ...rest }: Omit<ComponentProps<"input">, "type" | "className"> & { label: string; hint?: ReactNode }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-start gap-3 py-1">
      <input type="checkbox" className="mt-0.5 size-7 shrink-0 accent-crown-blue-deep" {...rest} />
      <span className="flex flex-col">
        <span className="text-body font-semibold text-ink">{label}</span>
        {hint ? <span className="text-small text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

/** Wide tables scroll sideways inside their own focusable region on phones. */
export function TableScroll({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className="overflow-x-auto rounded-card border-2 border-line bg-paper-raised">
      {children}
    </div>
  );
}

export const th = "border-b-2 border-line px-4 py-3 text-left text-body font-semibold whitespace-nowrap text-ink";
export const td = "border-b border-line px-4 py-3 align-top text-body text-ink";
export const textLink = "inline-flex min-h-12 items-center gap-2 font-semibold text-crown-blue-deep underline";
