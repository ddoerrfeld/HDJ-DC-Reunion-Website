import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, Notice } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/Button";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminSettings, SCHOOL_LABEL } from "@/lib/admin/data";
import { requireServiceDb } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "In Memoriam" };

export default async function AdminMemoriam({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const { ok, error } = await searchParams;
  const [{ data }, settings] = await Promise.all([requireServiceDb().from("memoriam").select("id, name, grad_school, years").order("name"), getAdminSettings()]);
  const rows = data ?? [];
  return (
    <div className="flex flex-col gap-8">
      <AdminHeader
        title="In Memoriam"
        actions={
          <ButtonLink href="/admin/memoriam/new" icon={<Plus size={20} strokeWidth={1.75} aria-hidden="true" />}>
            Add a name
          </ButtonLink>
        }
      >
        {settings.flags.inMemoriam ? (
          <>
            The page is on.{" "}
            <Link href="/in-memoriam" className="font-semibold text-crown-blue-deep underline">
              See it
            </Link>
          </>
        ) : (
          <>
            The page is off — turn it on in{" "}
            <Link href="/admin/settings" className="font-semibold text-crown-blue-deep underline">
              Settings
            </Link>{" "}
            when the list is ready. Names are shown alphabetically.
          </>
        )}
      </AdminHeader>
      <Notice ok={ok} error={error} />
      {rows.length === 0 ? <p className="text-body text-muted">No names yet.</p> : null}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((m) => (
          <li key={m.id} className="card flex flex-col p-4">
            <Link href={`/admin/memoriam/${m.id}`} className="text-lead font-semibold text-crown-blue-deep underline">
              {m.name}
            </Link>
            <span className="text-body text-muted">
              {SCHOOL_LABEL[m.grad_school]}
              {m.years ? ` · ${m.years}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
