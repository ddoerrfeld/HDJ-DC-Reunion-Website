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

/** Upload test images through the Storage API (service role). */
export async function uploadStorage(bucket: string, files: Array<{ path: string; body: Buffer; contentType: string }>) {
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  for (const f of files) {
    const { error } = await db.storage.from(bucket).upload(f.path, f.body, { contentType: f.contentType, upsert: true });
    if (error) throw new Error(`upload ${f.path}: ${error.message}`);
  }
}

/**
 * Clearly fictional directory people for tests and review screenshots. Each has
 * unique private values (email/phone/city) so tests can prove they never leak.
 */
export const DIRECTORY_PEOPLE = [
  { key: "alpha", first: "Testa", nick: "Tess", hs: "Abernathy", current: "Zimmerly", school: "crown", events: ["fri-tour-crown", "sat-golf", "sat-dinner"], photo: true, then: true },
  { key: "bravo", first: "Bartholomew", nick: "", hs: "Brávo", current: "", school: "jacobs", events: ["fri-game-jacobs", "sat-dinner"], photo: false, then: false },
  { key: "charlie", first: "Carlotta", nick: "Lottie", hs: "Charleston", current: "", school: "other", events: ["fri-pregame", "sat-pickleball"], photo: false, then: false },
  { key: "hidden", first: "Hidden", nick: "", hs: "Optedout", current: "", school: "crown", events: ["sat-dinner"], photo: false, then: false, hide: true },
  { key: "pending", first: "Pending", nick: "", hs: "Unverified", current: "", school: "jacobs", events: ["sat-dinner"], photo: false, then: false, pending: true },
] as const;

export const privateMarker = (key: string) => ({
  email: `dir-test-${key}@example.com`,
  phone: `555-01${key.length}${key.length}-${key.charCodeAt(0)}`,
  city: `Privateville${key}`,
});

export async function seedDirectory(): Promise<Record<string, string>> {
  const sharp = (await import("sharp")).default;
  clearDirectory();
  const ids: Record<string, string> = {};
  const pageId = sql("select id from public.yearbook_pages where school = 'crown' and not hidden order by seq offset 1 limit 1");
  for (const p of DIRECTORY_PEOPLE) {
    const m = privateMarker(p.key);
    const payload = {
      person: {
        firstName: p.first, hsLastName: p.hs, currentLastName: p.current, nickname: p.nick,
        email: m.email, phone: m.phone, city: m.city, state: "IL", gradSchool: p.school,
      },
      showInDirectory: !("hide" in p && p.hide),
      selections: p.events.map((slug) => ({ slug, guests: 0, halftime: false, guestNames: [] })),
    };
    const id = sql(`select (public.rsvp_create('${JSON.stringify(payload).replace(/'/g, "''")}'::jsonb, 'dir-test-${p.key}')) ->> 'attendeeId'`);
    ids[p.key] = id;
    sql(`update public.attendees set classmate_status = '${"pending" in p && p.pending ? "pending" : "approved"}' where id = '${id}'`);
    const tint = (r: number, g: number, b: number) =>
      sharp({ create: { width: 512, height: 512, channels: 3, background: { r, g, b } } });
    if (p.photo) {
      const path = `p/0000000${ids[p.key].slice(7)}`;
      await uploadStorage("attendee-photos", [
        { path: `${path}/512.webp`, body: await tint(120, 140, 170).webp().toBuffer(), contentType: "image/webp" },
        { path: `${path}/160.webp`, body: await tint(120, 140, 170).resize(160, 160).webp().toBuffer(), contentType: "image/webp" },
      ]);
      sql(`update public.attendees set photo_path = '${path}' where id = '${id}'`);
    }
    if (p.then) {
      const path = `t/0000000${ids[p.key].slice(7)}`;
      await uploadStorage("attendee-photos", [
        { path: `${path}/512.webp`, body: await tint(90, 90, 90).resize(512, 640).webp().toBuffer(), contentType: "image/webp" },
      ]);
      sql(`update public.attendees set yearbook_page_id = '${pageId}', then_photo_path = '${path}',
        yearbook_crop = '{"x":0.1,"y":0.2,"w":0.2,"h":0.25}'::jsonb where id = '${id}'`);
    }
  }
  return ids;
}

export function clearDirectory() {
  sql("delete from public.email_log where attendee_id in (select id from public.attendees where email::text like 'dir-test-%')");
  sql("delete from public.attendees where email::text like 'dir-test-%'");
}
