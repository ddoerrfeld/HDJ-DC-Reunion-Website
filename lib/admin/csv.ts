/**
 * CSV for Excel/Numbers/Google Sheets: UTF-8 with BOM (so ’ and accents survive
 * Excel), CRLF lines, quoted fields. Cells that a spreadsheet would run as a
 * formula (= + - @, tab, CR) get a leading apostrophe.
 */
export type Cell = string | number | boolean | null | undefined;

function cell(value: Cell): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
