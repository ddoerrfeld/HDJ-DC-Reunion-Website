import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseEnv, type Db } from "./server";

/**
 * SERVICE-ROLE client: bypasses RLS. Server-only (route handlers, server
 * actions). Never import from a client component. Used for RSVP writes,
 * private reads by edit token, storage, and rate limiting.
 */
export function serviceDb(): Db | null {
  const env = getSupabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!env || !key) return null;
  return createClient<Database>(env.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function requireServiceDb(): Db {
  const db = serviceDb();
  if (!db) throw new Error("Supabase service role is not configured (SUPABASE_SERVICE_ROLE_KEY).");
  return db;
}
