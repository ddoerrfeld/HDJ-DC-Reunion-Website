import { Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { AdminHeader, CheckboxField, Notice, TextAreaField, textLink } from "@/components/admin/ui";
import { TextField } from "@/components/ui/Field";
import { requireAdmin } from "@/lib/admin/auth";
import { UUID_RE } from "@/lib/admin/util";
import { requireServiceDb } from "@/lib/supabase/admin";
import { publicStorageUrl } from "@/lib/supabase/server";
import { deleteLodging, saveLodging } from "../actions";

export const metadata: Metadata = { title: "Hotel" };

export default async function EditLodging({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { ok, error } = await searchParams;
  const isNew = id === "new";
  if (!isNew && !UUID_RE.test(id)) notFound();
  const row = isNew ? null : (await requireServiceDb().from("lodging").select("*").eq("id", id).maybeSingle()).data;
  if (!isNew && !row) notFound();
  const photo = row?.photo_path ? publicStorageUrl("lodging", row.photo_path) : null;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <Link href="/admin/stay" className={textLink}>
        ← All hotels
      </Link>
      <AdminHeader title={row?.name ?? "Add a hotel"} />
      <Notice ok={ok} error={error} />
      <form action={saveLodging} className="flex flex-col gap-5">
        <input type="hidden" name="id" value={row?.id ?? ""} />
        <TextField id="name" name="name" label="Hotel name" defaultValue={row?.name ?? ""} required />
        <TextField id="address" name="address" label="Address" defaultValue={row?.address ?? ""} required />
        <TextField id="phone" name="phone" type="tel" label="Phone" optional defaultValue={row?.phone ?? ""} />
        <CheckboxField name="is_official_block" label="Official reunion room block" hint="Listed first, with the group code and booking deadline." defaultChecked={row?.is_official_block ?? false} />
        <TextField id="group_code" name="group_code" label="Group code" optional defaultValue={row?.group_code ?? ""} />
        <TextField id="rate_text" name="rate_text" label="Rate" optional hint="As you want it shown, e.g. “$129/night + tax”." defaultValue={row?.rate_text ?? ""} />
        <TextField id="cutoff_date" name="cutoff_date" type="date" label="Book by" optional defaultValue={row?.cutoff_date ?? ""} />
        <TextField id="booking_url" name="booking_url" type="url" label="Booking link" optional defaultValue={row?.booking_url ?? ""} />
        <TextAreaField id="drive_times_md" name="drive_times_md" label="Drive times" rows={3} hint="e.g. “10 minutes to Randall Oaks”. One per line." defaultValue={row?.drive_times_md ?? ""} />
        <TextAreaField id="notes_md" name="notes_md" label="Notes" rows={4} defaultValue={row?.notes_md ?? ""} />
        <div className="flex flex-col gap-3">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- storage image
            <img src={photo} alt={`Current photo of ${row?.name}`} className="aspect-[16/10] w-72 rounded-sm object-cover" />
          ) : null}
          <label htmlFor="photo" className="text-body font-semibold text-ink">
            {photo ? "Replace photo" : "Photo"} <span className="font-normal text-muted">(optional, up to 4 MB)</span>
          </label>
          <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="min-h-12 text-body text-ink file:mr-4 file:min-h-12 file:rounded-card file:border-2 file:border-ink file:bg-paper-raised file:px-4 file:font-semibold" />
          {photo ? <CheckboxField name="remove_photo" label="Remove the photo" /> : null}
        </div>
        <CheckboxField name="visible" label="Show on the Stay page" defaultChecked={row?.visible ?? true} />
        <div>
          <SubmitButton>{isNew ? "Add hotel" : "Save changes"}</SubmitButton>
        </div>
      </form>
      {row ? (
        <details className="rounded-card border-2 border-line p-4">
          <summary className="min-h-12 cursor-pointer content-center font-semibold text-ink">Delete this hotel…</summary>
          <form action={deleteLodging} className="mt-3">
            <input type="hidden" name="id" value={row.id} />
            <SubmitButton variant="secondary" pendingLabel="Deleting…" icon={<Trash2 size={20} strokeWidth={1.75} aria-hidden="true" />}>
              Delete hotel
            </SubmitButton>
          </form>
        </details>
      ) : null}
    </div>
  );
}
