/**
 * Generates the link-preview image (SPEC §14): app/opengraph-image.png and
 * app/twitter-image.png, 1200 × 630. Run: node scripts/generate-og.mts
 * Drawn with next/og (Satori) using the brand fonts in assets/fonts.
 */
import { readFile, writeFile } from "node:fs/promises";
import { ImageResponse } from "next/og.js";
import { createElement as h } from "react";
import { MONOGRAM as M } from "../components/brand/monogram-geometry.ts";

const [graduate, bitter, sans] = await Promise.all(
  ["Graduate-Regular.ttf", "Bitter-Bold.ttf", "SourceSans3-SemiBold.ttf"].map((f) => readFile(`assets/fonts/${f}`)),
);

const monogram = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${M.viewBox}"><g fill="#1F4E9E"><polygon points="${M.crownSeven}"/><path d="${M.horn}"/></g><polygon points="${M.seam}" fill="#E8A317"/><g fill="#4A2C12"><polygon points="${M.jacobsSeven}"/><path d="${M.wing}"/></g></svg>`;
// The site's seam: blue | gold at 62° | brown.
const band = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="24" viewBox="0 0 1200 24"><rect width="1200" height="24" fill="#4A2C12"/><polygon points="0,0 606,0 593.24,24 0,24" fill="#1F4E9E"/><polygon points="606,0 616,0 603.24,24 593.24,24" fill="#E8A317"/></svg>`;
const uri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const MONO_H = 300;
const element = h(
  "div",
  { style: { width: 1200, height: 630, display: "flex", flexDirection: "column", background: "#F7F1E3", color: "#1E1B16" } },
  h("img", { src: uri(band), width: 1200, height: 24 }),
  h(
    "div",
    { style: { flex: 1, display: "flex", alignItems: "center", padding: "0 80px", gap: 64 } },
    h("img", { src: uri(monogram), height: MONO_H, width: Math.round(MONO_H * M.aspect) }),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column" } },
      h("div", { style: { fontFamily: "Source Sans 3", fontSize: 26, letterSpacing: 3, color: "#14336B", textTransform: "uppercase" } }, "Irving Crown · Harry D. Jacobs"),
      h("div", { style: { fontFamily: "Graduate", fontSize: 92, lineHeight: 1.05, marginTop: 14, letterSpacing: 2 } }, "CLASS OF ’77"),
      h("div", { style: { fontFamily: "Bitter", fontSize: 54, color: "#14336B", marginTop: 8 } }, "50-Year Reunion"),
      h(
        "div",
        { style: { display: "flex", alignItems: "center", marginTop: 26, gap: 10 } },
        h("div", { style: { width: 120, height: 4, background: "#1F4E9E" } }),
        h("div", { style: { width: 6, height: 28, background: "#E8A317", transform: "skewX(-28deg)" } }),
        h("div", { style: { width: 120, height: 4, background: "#4A2C12" } }),
      ),
      h("div", { style: { fontFamily: "Source Sans 3", fontSize: 42, marginTop: 24 } }, "October 8–10, 2027"),
    ),
  ),
  h("div", { style: { display: "flex", justifyContent: "flex-end", padding: "0 80px 36px", fontFamily: "Source Sans 3", fontSize: 26, color: "#5C554A" } }, "crownjacobs77.com"),
);

const response = new ImageResponse(element, {
  width: 1200,
  height: 630,
  fonts: [
    { name: "Graduate", data: graduate, weight: 400, style: "normal" },
    { name: "Bitter", data: bitter, weight: 700, style: "normal" },
    { name: "Source Sans 3", data: sans, weight: 600, style: "normal" },
  ],
});
const png = Buffer.from(await response.arrayBuffer());
const alt = "Class of ’77 50-Year Reunion — Irving Crown and Harry D. Jacobs High Schools, October 8–10, 2027";
for (const name of ["opengraph-image", "twitter-image"]) {
  await writeFile(`app/${name}.png`, png);
  await writeFile(`app/${name}.alt.txt`, alt);
}
console.log(`Wrote app/opengraph-image.png and app/twitter-image.png (${png.length} bytes)`);
