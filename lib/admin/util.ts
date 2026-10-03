import { revalidatePath } from "next/cache";

/** Every public page reads admin-editable data; refresh them all after a change (pages also refresh within 60 s). */
export function refreshSite(): void {
  revalidatePath("/", "layout");
}

export function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

/** Trimmed text, or null when blank. */
export function optional(form: FormData, key: string): string | null {
  return str(form, key) || null;
}

export function bool(form: FormData, key: string): boolean {
  return form.get(key) === "on" || form.get(key) === "true" || form.get(key) === "1";
}

/** Whole number, or null when blank. NaN when not a number (callers validate). */
export function int(form: FormData, key: string): number | null {
  const s = str(form, key);
  return s === "" ? null : /^-?\d+$/.test(s) ? Number(s) : NaN;
}

/** "$45" / "45.50" → cents; null when blank; NaN when malformed. */
export function dollarsToCents(value: string): number | null {
  const s = value.replace(/[$,\s]/g, "");
  if (s === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isHttpUrl(value: string | null): boolean {
  if (!value) return true;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
