/**
 * Generates the favicon (app/icon.svg) and Apple touch icon (app/apple-icon.png)
 * from the monogram geometry. Run: node scripts/generate-icons.mts
 */
import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import { MONOGRAM as M } from "../components/brand/monogram-geometry.ts";

const glyphs = `<g fill="#1F4E9E"><polygon points="${M.crownSeven}"/><path d="${M.horn}"/></g><polygon points="${M.seam}" fill="#E8A317"/><g fill="#4A2C12"><polygon points="${M.jacobsSeven}"/><path d="${M.wing}"/></g>`;

// Square tile, paper background, monogram centered (viewBox is 150 × 120, y from −20).
function tile(size: number, radius: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 170 170"><rect width="170" height="170" rx="${radius}" fill="#F7F1E3"/><g transform="translate(10 45)">${glyphs}</g></svg>`;
}

await writeFile("app/icon.svg", tile(32, 30));
await sharp(Buffer.from(tile(180, 0))).png().toFile("app/apple-icon.png");
console.log("Wrote app/icon.svg and app/apple-icon.png");
