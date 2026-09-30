import { SETTINGS_SEED } from "@/lib/content/settings-seed";
import { publicDb } from "@/lib/supabase/server";

export interface PublicSettings {
  organizerContactEmail: string | null;
  rsvpDeadline: string | null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** Public settings only (RLS: is_public). Private settings are read with the service role in later phases. */
export async function getPublicSettings(): Promise<PublicSettings> {
  const db = publicDb();
  const rows: Array<{ key: string; value: unknown }> = db
    ? await db
        .from("settings")
        .select("key, value")
        .then(({ data, error }) => {
          if (error) throw new Error(`Failed to load settings: ${error.message}`);
          return data;
        })
    : SETTINGS_SEED.filter((s) => s.isPublic).map((s) => ({ key: s.key, value: s.value }));

  const map = new Map(rows.map((row) => [row.key, row.value]));
  return {
    organizerContactEmail: asString(map.get("organizer_contact_email")),
    rsvpDeadline: asString(map.get("rsvp_deadline")),
  };
}
