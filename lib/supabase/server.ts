import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSiteStage } from "@/lib/site";
import type { Database } from "./database.types";

export type Db = SupabaseClient<Database>;

interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/**
 * Accepts both our names and the ones the Supabase ↔ Vercel integration sets
 * automatically. The anon/publishable key is subject to RLS (public content only).
 */
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

let warned = false;

/**
 * Server-side client for PUBLIC reads. Returns null when Supabase is not
 * configured, in which case callers fall back to the SPEC §6 seed — allowed in
 * preview only, so the site keeps working before the owner connects Supabase.
 * In production a missing database is a hard error, never silent seed data.
 */
export function publicDb(): Db | null {
  const env = getSupabaseEnv();
  if (!env) {
    if (getSiteStage() === "production") {
      throw new Error("Supabase is not configured (SUPABASE_URL / SUPABASE_ANON_KEY).");
    }
    if (!warned) {
      warned = true;
      console.warn("[data] Supabase not configured — serving SPEC §6 seed data (preview only).");
    }
    return null;
  }
  return createClient<Database>(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Public URL for an object in a public Storage bucket. */
export function publicStorageUrl(bucket: string, path: string): string | null {
  const env = getSupabaseEnv();
  if (!env) return null;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${env.url}/storage/v1/object/public/${bucket}/${encoded}`;
}
