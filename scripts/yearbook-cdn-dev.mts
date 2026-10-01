/**
 * Local stand-in for the yearbook Worker (yearbook-cdn/) used by dev and tests:
 * same signature check, serving files from a local folder.
 *   YEARBOOK_SIGNING_SECRET=… node scripts/yearbook-cdn-dev.mts [dir[,dir…]] [port]
 * Several folders can be given (comma-separated); the first that has the file wins.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { assetHeaders, verifySignedPath } from "../yearbook-cdn/src/verify.js";

const roots = (process.argv[2] ?? ".yearbook-build/assets").split(",");
const port = Number(process.argv[3] ?? 8787);
const secret = process.env.YEARBOOK_SIGNING_SECRET ?? "";
const TYPES: Record<string, string> = { ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png" };

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname === "/health") {
    res.writeHead(200).end("ok");
    return;
  }
  const exp = url.searchParams.get("e");
  const path = normalize(decodeURIComponent(url.pathname));
  if (path.includes("..") || !(await verifySignedPath(url.pathname, exp, url.searchParams.get("s"), secret))) {
    res.writeHead(404).end("Not found");
    return;
  }
  for (const root of roots) {
    try {
      const body = await readFile(join(root, path));
      res.writeHead(200, { "Content-Type": TYPES[extname(path)] ?? "application/octet-stream", ...assetHeaders(exp) });
      res.end(body);
      return;
    } catch {
      // try the next folder
    }
  }
  res.writeHead(404).end("Not found");
}).listen(port, () => console.log(`yearbook CDN (dev) on http://localhost:${port} serving ${roots.join(", ")}`));
