import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, Notice } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { requireAdmin } from "@/lib/admin/auth";
import { requireServiceDb } from "@/lib/supabase/admin";
import { moveLodging } from "./actions";

export const metadata: Metadata = { title: "Stay" };

const iconBtn = "inline-flex min-h-12 min-w-12 items-center justify-center rounded-card border-2 border-line-strong bg-paper-raised font-semibold text-ink hover:border-ink disabled:opacity-40";

export default async function AdminStay({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const { ok, error } = await searchParams;
  const { data: rows } = await requireServiceDb().from("lodging").select("id, name, address, is_official_block, visible, rate_text").order("sort").order("name");
  const list = rows ?? [];
  return (
    <div className="flex flex-col gap-8">
      <AdminHeader
        title="Stay"
        actions={
          <ButtonLink href="/admin/stay/new" icon={<Plus size={20} strokeWidth={1.75} aria-hidden="true" />}>
            Add a hotel
          </ButtonLink>
        }
      >
        Hotels on the Stay page. Official room blocks are always listed first.{" "}
        <Link href="/stay" className="font-semibold text-crown-blue-deep underline">
          See the Stay page
        </Link>
      </AdminHeader>
      <Notice ok={ok} error={error} />
      {list.length === 0 ? <p className="text-body text-muted">No hotels yet. The Stay page shows a “details coming soon” message until you add one.</p> : null}
      <ul className="flex flex-col gap-3">
        {list.map((l, i) => (
          <li key={l.id} id={`l-${l.id}`} className="card flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex flex-col gap-1">
              <Link href={`/admin/stay/${l.id}`} className="text-lead font-semibold text-crown-blue-deep underline">
                {l.name}
              </Link>
              <span className="text-body text-muted">{l.address}</span>
              <span className="flex flex-wrap gap-2">
                {l.is_official_block ? <Badge tone="paid">Official block</Badge> : null}
                {l.visible ? null : <Badge tone="pending">Hidden</Badge>}
              </span>
            </div>
            <div className="flex gap-2">
              {(["up", "down"] as const).map((dir) => (
                <form key={dir} action={moveLodging}>
                  <input type="hidden" name="id" value={l.id} />
                  <input type="hidden" name="dir" value={dir} />
                  <button type="submit" className={iconBtn} disabled={dir === "up" ? i === 0 : i === list.length - 1} aria-label={`Move ${l.name} ${dir}`}>
                    {dir === "up" ? <ArrowUp size={20} strokeWidth={1.75} aria-hidden="true" /> : <ArrowDown size={20} strokeWidth={1.75} aria-hidden="true" />}
                  </button>
                </form>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
