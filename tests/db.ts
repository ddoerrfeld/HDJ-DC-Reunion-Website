import { execFileSync } from "node:child_process";
import type { APIRequestContext } from "@playwright/test";

/** Direct SQL against the test database (local Supabase by default; CI starts one). */
export const DB_URL = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export function sql(statement: string): string {
  return execFileSync("psql", [DB_URL, "-v", "ON_ERROR_STOP=1", "-Atq", "-c", statement], { encoding: "utf8" }).trim();
}

/** Ask the app to refresh cached pages now (what admin saves will do in Phase 7). */
export async function revalidate(request: APIRequestContext) {
  const response = await request.post("/api/revalidate", {
    headers: { authorization: `Bearer ${process.env.REVALIDATE_SECRET ?? "local-revalidate-secret-123456"}` },
  });
  if (!response.ok()) throw new Error(`revalidate failed: ${response.status()}`);
}

/** Clearly fictional lodging rows used only by tests and review screenshots. */
export const LODGING_FIXTURES = {
  official: `('Test Hotel — Official Block', '100 Example Rd, Algonquin, IL 60102', '(847) 555-0100', true, 'CLASS77',
    'https://example.com/book', '$129/night + tax', (now() at time zone 'America/Chicago')::date + 23,
    '- 8 min to the VFW\n- 12 min to Jacobs', '**Breakfast included.** Free parking.', true, 1)`,
  nearbyOpen: `('Test Inn Nearby', '200 Example Ave, West Dundee, IL 60118', null, false, 'REUNION',
    'https://example.com/inn', '$109/night', (now() at time zone 'America/Chicago')::date + 40,
    null, 'Pet friendly.', true, 2)`,
  nearbyClosed: `('Test Suites', '300 Example Blvd, Carpentersville, IL 60110', '(847) 555-0300', false, null,
    null, 'Call for rates', (now() at time zone 'America/Chicago')::date - 3,
    '15 min to Dundee-Crown', null, true, 3)`,
} as const;

export function setLodging(rows: Array<keyof typeof LODGING_FIXTURES>) {
  sql("delete from public.lodging where name like 'Test %'");
  if (rows.length === 0) return;
  sql(`insert into public.lodging (name, address, phone, is_official_block, group_code, booking_url, rate_text,
    cutoff_date, drive_times_md, notes_md, visible, sort) values ${rows.map((r) => LODGING_FIXTURES[r]).join(", ")}`);
}

/** Remove storage objects through the Storage API (direct SQL deletes are blocked by Supabase). */
export async function removeStorage(bucket: string, paths: string[]) {
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  await db.storage.from(bucket).remove(paths);
}
