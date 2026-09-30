/**
 * Local stand-in for the yearbook Worker (yearbook-cdn/) used by dev and tests:
 * same signature check, serving files from a local folder.
 *   YEARBOOK_SIGNING_SECRET=… node scripts/yearbook-cdn-dev.mts [dir] [port]
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { assetHeaders, verifySignedPath } from "../yearbook-cdn/src/verify.js";

const root = process.argv[2] ?? ".yearbook-build/assets";
const port = Number(process.argv[3] ?? 8787);
const secret = process.env.YEARBOOK_SIGNING_SECRET ?? "";
const TYPES: Record<string, string> = { ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png" };

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const exp = url.searchParams.get("e");
  const path = normalize(decodeURIComponent(url.pathname));
  if (path.includes("..") || !(await verifySignedPath(url.pathname, exp, url.searchParams.get("s"), secret))) {
    res.writeHead(404).end("Not found");
    return;
  }
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { "Content-Type": TYPES[extname(path)] ?? "application/octet-stream", ...assetHeaders(exp) });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(port, () => console.log(`yearbook CDN (dev) on http://localhost:${port} serving ${root}`));
