import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, Notice } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getAllAttendees } from "@/lib/admin/data";
import { clearSeeMe, setPhotoHidden } from "../rsvps/actions";

export const metadata: Metadata = { title: "Photos" };

const small =
  "inline-flex min-h-12 w-full items-center justify-center rounded-card border-2 border-ink bg-paper-raised px-3 font-semibold text-ink hover:bg-paper-sunk";

export default async function AdminPhotos({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const { ok, error } = await searchParams;
  const people = (await getAllAttendees()).filter((a) => a.photoUrl || a.thenPhotoUrl);
  const hidden = people.filter((a) => a.photoHidden).length;

  return (
    <div className="flex flex-col gap-8">
      <AdminHeader title="Photos">
        Every uploaded photo and ’77 portrait. Hiding a photo shows the monogram on the site instead; the person can upload a new one.
      </AdminHeader>
      <Notice ok={ok} error={error} />
      <p className="text-lead text-ink">
        {people.length} {people.length === 1 ? "person" : "people"} with photos{hidden ? ` · ${hidden} hidden` : ""}
      </p>
      {people.length === 0 ? <p className="text-body text-muted">No photos yet.</p> : null}
      <ul className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {people.map((a) => (
          <li key={a.id} id={`a-${a.id}`} className="card flex scroll-mt-24 flex-col gap-3 p-4">
            <Link href={`/admin/rsvps/${a.id}`} className="font-semibold text-crown-blue-deep underline">
              {a.displayName}
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <figure className="flex flex-col gap-2">
                {a.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- storage image, pre-sized
                  <img src={a.photoUrl} alt={`${a.displayName} today`} width={512} height={512} loading="lazy" className={`aspect-square w-full rounded-sm object-cover ${a.photoHidden ? "opacity-40" : ""}`} />
                ) : (
                  <div className="flex aspect-square items-center justify-center rounded-sm bg-paper-sunk text-small text-muted">None</div>
                )}
                <figcaption className="text-small text-muted">{a.photoHidden ? "Today · hidden" : "Today"}</figcaption>
              </figure>
              <figure className="flex flex-col gap-2">
                {a.thenPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- storage image, pre-sized
                  <img src={a.thenPhotoUrl} alt={`${a.displayName} in 1977`} width={512} height={640} loading="lazy" className="aspect-square w-full rounded-sm object-cover object-top" />
                ) : (
                  <div className="flex aspect-square items-center justify-center rounded-sm bg-paper-sunk text-small text-muted">None</div>
                )}
                <figcaption className="text-small text-muted">In ’77</figcaption>
              </figure>
            </div>
            {a.photoUrl ? (
              <form action={setPhotoHidden}>
                <input type="hidden" name="attendee" value={a.id} />
                <input type="hidden" name="from" value="photos" />
                <input type="hidden" name="hidden" value={a.photoHidden ? "0" : "1"} />
                <button type="submit" className={small}>
                  {a.photoHidden ? "Restore photo" : "Hide photo"}
                  <span className="visually-hidden"> of {a.displayName}</span>
                </button>
              </form>
            ) : null}
            {a.thenPhotoUrl ? (
              <form action={clearSeeMe}>
                <input type="hidden" name="attendee" value={a.id} />
                <input type="hidden" name="from" value="photos" />
                <button type="submit" className={small}>
                  Clear ’77 portrait<span className="visually-hidden"> of {a.displayName}</span>
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
