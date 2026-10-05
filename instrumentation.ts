import type { Instrumentation } from "next";

/** Records every server-side error (pages, route handlers, server actions, proxy) — see lib/monitoring.ts. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportError } = await import("./lib/monitoring");
  const e = err instanceof Error ? err : new Error(String(err));
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : null;
  await reportError({
    source: "server",
    message: e.message || "Unknown error",
    digest,
    // Path without the query string: edit links and tokens never leave the request.
    path: request.path.split("?")[0],
    route: `${context.routeType} ${context.routePath}`,
    detail: e.stack?.split("\n").slice(0, 8).join("\n") ?? null,
  });
};
