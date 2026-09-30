import type { Database } from "@/lib/supabase/database.types";
import { publicDb, publicStorageUrl } from "@/lib/supabase/server";

type LodgingRow = Database["public"]["Tables"]["lodging"]["Row"];

export interface Lodging {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  isOfficialBlock: boolean;
  groupCode: string | null;
  bookingUrl: string | null;
  rateText: string | null;
  /** YYYY-MM-DD, last day the group rate is held. */
  cutoffDate: string | null;
  driveTimesMd: string | null;
  photoUrl: string | null;
  notesMd: string | null;
}

export function lodgingFromRow(row: LodgingRow): Lodging {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    isOfficialBlock: row.is_official_block,
    groupCode: row.group_code,
    bookingUrl: row.booking_url,
    rateText: row.rate_text,
    cutoffDate: row.cutoff_date,
    driveTimesMd: row.drive_times_md,
    photoUrl: row.photo_path ? publicStorageUrl("lodging", row.photo_path) : null,
    notesMd: row.notes_md,
  };
}

/** Visible lodging, official blocks first, then admin sort order. Empty in unconfigured preview. */
export async function getLodging(): Promise<Lodging[]> {
  const db = publicDb();
  if (!db) return [];
  const { data, error } = await db
    .from("lodging")
    .select("*")
    .eq("visible", true)
    .order("is_official_block", { ascending: false })
    .order("sort")
    .order("name");
  if (error) throw new Error(`Failed to load lodging: ${error.message}`);
  return data.map(lodgingFromRow);
}
