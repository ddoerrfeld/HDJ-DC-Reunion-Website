import { Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { AdminHeader, CheckboxField, Notice, SelectField, TextAreaField, textLink } from "@/components/admin/ui";
import { TextField } from "@/components/ui/Field";
import { requireAdmin } from "@/lib/admin/auth";
import { UUID_RE } from "@/lib/admin/util";
import { requireServiceDb } from "@/lib/supabase/admin";
import { publicStorageUrl } from "@/lib/supabase/server";
import { deleteMemorial, saveMemorial } from "../actions";

export const metadata: Metadata = { title: "In Memoriam" };

export default async function EditMemorial({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;
  const isNew = id === "new";
  if (!isNew && !UUID_RE.test(id)) notFound();
  const row = isNew ? null : (await requireServiceDb().from("memoriam").select("*").eq("id", id).maybeSingle()).data;
  if (!isNew && !row) notFound();
  const photo = row?.photo_path ? publicStorageUrl("memoriam", row.photo_path) : null;

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <Link href="/admin/memoriam" className={textLink}>
        ← In Memoriam
      </Link>
      <AdminHeader title={row?.name ?? "Add a name"} />
      <Notice error={error} />
      <form action={saveMemorial} className="flex flex-col gap-5">
        <input type="hidden" name="id" value={row?.id ?? ""} />
        <TextField id="name" name="name" label="Name" hint="As classmates knew them, e.g. Margaret “Peggy” (Olson) Hart." defaultValue={row?.name ?? ""} required />
        <SelectField id="grad_school" name="grad_school" label="School" defaultValue={row?.grad_school ?? "crown"} options={[{ value: "crown", label: "Irving Crown" }, { value: "jacobs", label: "Harry D. Jacobs" }, { value: "other", label: "Other / attended both" }]} />
        <TextField id="years" name="years" label="Years" optional hint="e.g. 1959–2019" defaultValue={row?.years ?? ""} />
        <TextAreaField id="note" name="note" label="A few words" rows={3} defaultValue={row?.note ?? ""} />
        <div className="flex flex-col gap-3">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- storage image
            <img src={photo} alt={`Current photo of ${row?.name}`} width={480} height={600} className="aspect-[4/5] w-40 rounded-sm object-cover" />
          ) : null}
          <label htmlFor="photo" className="text-body font-semibold text-ink">
            {photo ? "Replace photo" : "Photo"} <span className="font-normal text-muted">(optional, up to 4 MB — a senior portrait works well)</span>
          </label>
          <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="min-h-12 text-body text-ink file:mr-4 file:min-h-12 file:rounded-card file:border-2 file:border-ink file:bg-paper-raised file:px-4 file:font-semibold" />
          {photo ? <CheckboxField name="remove_photo" label="Remove the photo" /> : null}
        </div>
        <div>
          <SubmitButton>{isNew ? "Add" : "Save changes"}</SubmitButton>
        </div>
      </form>
      {row ? (
        <details className="rounded-card border-2 border-line p-4">
          <summary className="min-h-12 cursor-pointer content-center font-semibold text-ink">Remove from the list…</summary>
          <form action={deleteMemorial} className="mt-3">
            <input type="hidden" name="id" value={row.id} />
            <SubmitButton variant="secondary" pendingLabel="Removing…" icon={<Trash2 size={20} strokeWidth={1.75} aria-hidden="true" />}>
              Remove
            </SubmitButton>
          </form>
        </details>
      ) : null}
    </div>
  );
}
