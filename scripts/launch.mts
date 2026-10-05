/**
 * Launch cutover (SPEC §15 Phase 8) — only when the owner says go.
 *
 *   node scripts/launch.mts check      readiness report, changes nothing
 *   node scripts/launch.mts go         purge test data, SITE_STAGE=production, redeploy
 *   node scripts/launch.mts rollback   SITE_STAGE=preview (passcode back on), redeploy
 *
 * Needs SUPABASE_ACCESS_TOKEN and VERCEL_TOKEN in the environment.
 */
const PROJECT_REF = "dbaoigdmkfzkxwvzifmq";
const VERCEL_PROJECT = "prj_ocpbHF5JKZJUq5uWB0Y7YkN3TM60";
const TEAM = "team_O4ABC8YJQOXF48wCGbFEs4TG";
const SITE = "https://crownjacobs77.com";

// Clearly fictional addresses used by tests and demos; real RSVPs are never touched.
const TEST_EMAIL = `(email::text ilike '%@example.com' or email::text ilike '%@example.org' or email::text ilike '%@test.%' or email::text ilike '%@resend.dev')`;

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

async function sql<T = Record<string, unknown>>(query: string): Promise<T[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${need("SUPABASE_ACCESS_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`SQL failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as T[];
}

async function vercel<T>(path: string, init?: RequestInit): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`https://api.vercel.com${path}${sep}teamId=${TEAM}`, {
    ...init,
    headers: { Authorization: `Bearer ${need("VERCEL_TOKEN")}`, "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`Vercel ${path} failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as T;
}

interface Env {
  id: string;
  key: string;
  target: string[];
}

async function check(): Promise<boolean> {
  const { envs } = await vercel<{ envs: Env[] }>(`/v9/projects/${VERCEL_PROJECT}/env`);
  const keys = new Set(envs.filter((e) => e.target.includes("production")).map((e) => e.key));
  const required = ["SITE_STAGE", "SITE_GATE_SECRET", "NEXT_PUBLIC_SITE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "EMAIL_FROM", "REVALIDATE_SECRET", "CRON_SECRET", "YEARBOOK_CDN_URL", "YEARBOOK_SIGNING_SECRET"];
  const missing = required.filter((k) => !keys.has(k));
  const [counts] = await sql<Record<string, number>>(`select
      (select count(*) from public.attendees where status = 'active') as rsvps,
      (select count(*) from public.attendees where ${TEST_EMAIL}) as test_rsvps,
      (select count(*) from public.attendees where classmate_status = 'pending' and status = 'active') as waiting,
      (select count(*) from public.classmates) as roster,
      (select count(*) from public.admin_users) as organizers,
      (select count(*) from public.yearbook_pages) as yearbook_pages,
      (select count(*) from public.error_log where created_at > now() - interval '7 days') as errors_7d`);
  const health = await fetch(`${SITE}/api/health`).then((r) => r.status).catch(() => 0);
  const robots = await fetch(`${SITE}/robots.txt`).then((r) => r.text()).catch(() => "");
  const stage = robots.includes("Disallow: /\n") || robots.trim().endsWith("Disallow: /") ? "preview (passcode on)" : "production (public)";
  console.log(`Site stage now:     ${stage}`);
  console.log(`Health check:       ${health === 200 ? "OK" : `FAILED (${health})`}`);
  console.log(`Vercel env:         ${missing.length ? `MISSING ${missing.join(", ")}` : "all required variables set"}`);
  for (const [k, v] of Object.entries(counts)) console.log(`${k.padEnd(19)} ${v}`);
  const ok = health === 200 && missing.length === 0 && Number(counts.roster) > 0 && Number(counts.organizers) > 0 && Number(counts.yearbook_pages) > 0;
  console.log(ok ? "\nReady to launch." : "\nNOT ready — fix the items above first.");
  return ok;
}

async function setStage(stage: "production" | "preview") {
  const { envs } = await vercel<{ envs: Env[] }>(`/v9/projects/${VERCEL_PROJECT}/env`);
  const env = envs.find((e) => e.key === "SITE_STAGE" && e.target.includes("production"));
  if (!env) throw new Error("SITE_STAGE is not defined for production in Vercel");
  await vercel(`/v9/projects/${VERCEL_PROJECT}/env/${env.id}`, { method: "PATCH", body: JSON.stringify({ value: stage }) });
  // Env changes only apply to a new deployment: redeploy the current production build.
  const { deployments } = await vercel<{ deployments: Array<{ uid: string; name: string }> }>(`/v6/deployments?projectId=${VERCEL_PROJECT}&target=production&state=READY&limit=1`);
  const latest = deployments[0];
  if (!latest) throw new Error("No production deployment to redeploy");
  const created = await vercel<{ id: string; url: string }>(`/v13/deployments?forceNew=1`, {
    method: "POST",
    body: JSON.stringify({ name: latest.name, deploymentId: latest.uid, target: "production" }),
  });
  console.log(`SITE_STAGE=${stage}; redeploying (${created.url}). Live in about two minutes.`);
}

async function purgeTestData() {
  const [removed] = await sql<{ rsvps: number }>(`with gone as (delete from public.attendees where ${TEST_EMAIL} returning 1) select count(*) as rsvps from gone`);
  await sql(`delete from public.email_log; delete from public.rate_limits; delete from public.error_log; delete from public.admin_login_tokens where used_at is not null or expires_at < now();`);
  console.log(`Removed ${removed?.rsvps ?? 0} test RSVPs, the email log, rate-limit counters and old error records.`);
}

const command = process.argv[2] ?? "check";
if (command === "check") {
  await check();
} else if (command === "go") {
  if (!(await check())) process.exit(1);
  await purgeTestData();
  await setStage("production");
} else if (command === "rollback") {
  await setStage("preview");
} else {
  console.error("Usage: node scripts/launch.mts check | go | rollback");
  process.exit(1);
}
