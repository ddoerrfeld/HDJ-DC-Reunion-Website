import { publicDb, publicStorageUrl } from "@/lib/supabase/server";

export interface Memorial {
  id: string;
  name: string;
  school: "crown" | "jacobs" | "other";
  years: string | null;
  note: string | null;
  photoUrl: string | null;
}

/** In Memoriam names (admin-entered only), alphabetical. */
export async function getMemoriam(): Promise<Memorial[]> {
  const db = publicDb();
  if (!db) return [];
  const { data, error } = await db.from("memoriam").select("id, name, grad_school, years, note, photo_path").order("name");
  if (error) throw new Error(`Failed to load In Memoriam: ${error.message}`);
  return data.map((m) => ({
    id: m.id,
    name: m.name,
    school: m.grad_school,
    years: m.years,
    note: m.note,
    photoUrl: m.photo_path ? publicStorageUrl("memoriam", m.photo_path) : null,
  }));
}
