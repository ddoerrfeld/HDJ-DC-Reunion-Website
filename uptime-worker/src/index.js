/**
 * Uptime check for crownjacobs77.com (SPEC §14), run by Cloudflare every five
 * minutes, independent of Vercel and Supabase. Two failed checks in a row →
 * one "site is down" email; one more when it recovers. State lives in KV.
 * Secrets: RESEND_API_KEY, ALERT_TO. Vars: CHECK_URL, ALERT_FROM.
 */

async function check(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "crownjacobs77-uptime" }, signal: AbortSignal.timeout(15000), cf: { cacheTtl: 0 } });
    return res.ok ? null : `HTTP ${res.status}`;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

async function email(env, subject, text) {
  if (!env.RESEND_API_KEY || !env.ALERT_TO) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.ALERT_FROM, to: [env.ALERT_TO], subject, text }),
  });
}

export async function run(env, now = new Date()) {
  const problem = await check(env.CHECK_URL);
  const state = (await env.UPTIME.get("state", "json")) ?? { failures: 0, down: false, since: null };
  const stamp = now.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  if (problem) {
    const failures = state.failures + 1;
    if (!state.down && failures >= 2) {
      await email(env, "The reunion website is down", `crownjacobs77.com has not answered two checks in a row (${stamp}).\n\nProblem: ${problem}\n\nYou'll get another email when it is back. If it stays down, forward this to whoever maintains the site.`);
      await env.UPTIME.put("state", JSON.stringify({ failures, down: true, since: stamp }));
    } else if (failures !== state.failures) {
      await env.UPTIME.put("state", JSON.stringify({ ...state, failures }));
    }
  } else if (state.down) {
    await email(env, "The reunion website is back up", `crownjacobs77.com is answering again (${stamp}). It was down since ${state.since}.`);
    await env.UPTIME.put("state", JSON.stringify({ failures: 0, down: false, since: null }));
  } else if (state.failures) {
    await env.UPTIME.put("state", JSON.stringify({ failures: 0, down: false, since: null }));
  }
  return problem;
}

const worker = {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(run(env));
  },
  // Manual check (no secrets or state revealed): GET / → "ok" or "down".
  async fetch(_request, env) {
    const state = (await env.UPTIME.get("state", "json")) ?? { down: false };
    return new Response(state.down ? "down" : "ok", { headers: { "Content-Type": "text/plain" } });
  },
};

export default worker;
