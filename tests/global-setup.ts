import { sql } from "./db";

/**
 * Yearbook test data. CI has no scans: load the three grey test pages (SPEC §0
 * allows at most 3) as a tiny book per school, plus two roster names that also
 * exist in the real books (so tests pass the same way against a local database
 * that has the real yearbooks ingested). Real data, when present, is left alone.
 */
export default function globalSetup() {
  const pages = Number(sql("select count(*) from public.yearbook_pages"));
  if (pages === 0) {
    for (const school of ["crown", "jacobs"]) {
      sql(`insert into public.yearbook_pages (school, seq, thumb_url, display_url, display_jpg_url, zoom_url, width, height, hidden, ocr_text)
        select '${school}', n, 'test/00' || n || '/t.webp', 'test/00' || n || '/d.webp', 'test/00' || n || '/d.jpg', 'test/00' || n || '/d.webp', 1100, 1440, false,
          case when n = 2 then 'Donna Coleman Lynn Bye Senior Class' else null end
        from generate_series(1, 3) as n`);
      sql(`update public.yearbook_books set seniors_start_seq = 2, seniors_end_seq = 2 where school = '${school}'`);
    }
  }
  if (Number(sql("select count(*) from public.classmates")) === 0) {
    sql(`insert into public.classmates (school, first_name, last_name, yearbook_page_id, source)
      select 'crown'::public.yearbook_school, 'Donna', 'Coleman', (select id from public.yearbook_pages where school = 'crown' and seq = 2), 'manual'
      union all
      select 'jacobs'::public.yearbook_school, 'Lynn', 'Bye', (select id from public.yearbook_pages where school = 'jacobs' and seq = 2), 'manual'`);
  }
}
