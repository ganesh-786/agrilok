// Render the app icons from the logo. Run after changing app/icon.svg:
//
//   npm run icons
//
// sharp ships with Next.js, so this needs no extra dependency.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const svg = await fs.readFile(path.join(root, "app", "icon.svg"));
const out = path.join(root, "public", "icons");
await fs.mkdir(out, { recursive: true });

async function render(file, size) {
  await sharp(svg, { density: 512 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(out, file));
}

// A maskable icon needs its artwork inside the central safe zone, on a
// full-bleed background, because launchers crop it into circles and squircles.
async function renderMaskable(file, size) {
  const inner = Math.round(size * 0.72);
  const logo = await sharp(svg, { density: 512 }).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: "#2d5a32" } })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(out, file));
}

await render("icon-192.png", 192);
await render("icon-512.png", 512);
await render("apple-touch-icon.png", 180);
await renderMaskable("icon-maskable-512.png", 512);
console.log("icons written to public/icons");
