import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { AdminHeader, Notice, TableScroll, td, textLink, th } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { formatStamp } from "@/lib/admin/data";
import { requireServiceDb } from "@/lib/supabase/admin";
import { clearProblems } from "./actions";

export const metadata: Metadata = { title: "Site problems" };

export default async function AdminProblems({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requireAdmin();
  const { ok } = await searchParams;
  const { data } = await requireServiceDb().from("error_log").select("*").order("created_at", { ascending: false }).limit(300);
  const rows = data ?? [];
  // Same message on the same page = one problem, with a count.
  const groups = new Map<string, { message: string; path: string | null; source: string; count: number; last: string; detail: string | null; digest: string | null }>();
  for (const r of rows) {
    const k = `${r.source}|${r.path}|${r.message}`;
    const g = groups.get(k);
    if (g) g.count += 1;
    else groups.set(k, { message: r.message, path: r.path, source: r.source, count: 1, last: r.created_at, detail: r.detail, digest: r.digest });
  }

  return (
    <div className="flex flex-col gap-8">
      <Link href="/admin" className={textLink}>
        ← Dashboard
      </Link>
      <AdminHeader title="Site problems">
        Errors the site recorded automatically, newest first. An occasional one-off is normal (a dropped phone connection, an old browser). If
        the same problem keeps appearing, or a page looks broken, send this page to whoever maintains the site.
      </AdminHeader>
      <Notice ok={ok} />
      {groups.size === 0 ? (
        <p className="card p-6 text-lead text-ink">No problems recorded. Everything is running normally.</p>
      ) : (
        <>
          <TableScroll label="Recorded problems">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={th}>Last seen</th>
                  <th scope="col" className={th}>Times</th>
                  <th scope="col" className={th}>Page</th>
                  <th scope="col" className={th}>Problem</th>
                </tr>
              </thead>
              <tbody>
                {[...groups.values()].map((g) => (
                  <tr key={`${g.source}${g.path}${g.message}`}>
                    <td className={`${td} whitespace-nowrap`}>{formatStamp(g.last)}</td>
                    <td className={td}>{g.count}</td>
                    <td className={`${td} break-all`}>{g.path ?? "—"}</td>
                    <td className={td}>
                      <span className="font-semibold">{g.source === "server" ? "Server" : "Browser"}:</span> {g.message}
                      {g.digest ? <span className="block text-small text-muted">Reference {g.digest}</span> : null}
                      {g.detail ? (
                        <details className="mt-1">
                          <summary className="inline-flex min-h-12 cursor-pointer items-center text-small font-semibold text-crown-blue-deep underline">Technical details</summary>
                          <pre className="overflow-x-auto rounded-sm bg-paper-sunk p-3 text-small whitespace-pre-wrap">{g.detail}</pre>
                        </details>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <form action={clearProblems}>
            <SubmitButton variant="secondary" pendingLabel="Clearing…">
              Clear the list
            </SubmitButton>
          </form>
        </>
      )}
    </div>
  );
}
