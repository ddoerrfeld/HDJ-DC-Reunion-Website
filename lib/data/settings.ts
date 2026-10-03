import { cache } from "react";
import { resolveSiteText, type SiteText } from "@/lib/content/site-text";
import { SETTINGS_SEED } from "@/lib/content/settings-seed";
import { publicDb } from "@/lib/supabase/server";

export interface PublicSettings {
  organizerContactEmail: string | null;
  rsvpDeadline: string | null;
  refundPolicyMd: string | null;
  refundCutoffDate: string | null;
  faqMd: string | null;
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
    refundPolicyMd: asString(map.get("refund_policy_md")),
    refundCutoffDate: asString(map.get("refund_cutoff_date")),
    faqMd: asString(map.get("faq_md")),
  };
}

export interface FeatureFlags {
  inMemoriam: boolean;
  faq: boolean;
  yearbookOcr: boolean;
}

/** SPEC §2 optional features (organizer-controlled, default off). */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  const db = publicDb();
  const value: unknown = db
    ? await db
        .from("settings")
        .select("value")
        .eq("key", "feature_flags")
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw new Error(`Failed to load feature flags: ${error.message}`);
          return data?.value;
        })
    : SETTINGS_SEED.find((s) => s.key === "feature_flags")?.value;
  const flags = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return { inMemoriam: flags.in_memoriam === true, faq: flags.faq === true, yearbookOcr: flags.yearbook_ocr === true };
}

/**
 * Organizer-edited site copy over the built-in defaults (lib/content/site-text.ts).
 * Cached per request: many components on one page read it.
 */
export const getSiteText = cache(async (): Promise<SiteText> => {
  const db = publicDb();
  if (!db) return resolveSiteText(null);
  const { data, error } = await db.from("settings").select("value").eq("key", "site_text").maybeSingle();
  if (error) throw new Error(`Failed to load site text: ${error.message}`);
  return resolveSiteText(data?.value);
});
