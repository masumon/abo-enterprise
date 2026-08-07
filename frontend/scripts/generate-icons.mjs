import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
// logo.png is the ABO Enterprise lockup (ABO mark + ENTERPRISE wordmark +
// "SIMPLE SOLUTIONS") drawn inside a white circle with a thin dark ring, on a
// 512×512 canvas with transparent corners. The wordmark needs a light
// background to stay legible (its type is navy/brown/red), so the icons keep a
// white field and simply present the logo as LARGE as the format allows.
const logoPath = path.join(publicDir, "logo.png");
const iconsDir = path.join(publicDir, "icons");

// Brand palette (tailwind: brand-600 nil / accent-500 gada).
const NAVY = "#1e2b6b";
const NAVY_DEEP = "#0e1533";
const GOLD = "#e4a11b";
const WHITE = "#ffffff";

/**
 * The logo at `size`, zoomed by `zoom`. zoom > 1 crops the empty margin and the
 * outer ring so the wordmark reads bigger and fills the frame ("full logo"
 * instead of a small mark floating in a circle). The result is a size×size
 * RGBA buffer, transparent where the source is transparent.
 */
async function fitLogo(size, zoom = 1) {
  const dim = Math.round(size * zoom);
  const resized = await sharp(logoPath).resize(dim, dim).png().toBuffer();
  if (dim > size) {
    const off = Math.round((dim - size) / 2);
    return sharp(resized).extract({ left: off, top: off, width: size, height: size }).png().toBuffer();
  }
  if (dim < size) {
    const off = Math.round((size - dim) / 2);
    return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: resized, top: off, left: off }])
      .png()
      .toBuffer();
  }
  return resized;
}

/** Zoomed logo re-masked to a crisp circle, transparent corners. purpose "any". */
async function roundLogo(size, zoom = 1.12) {
  const logo = await fitLogo(size, zoom);
  const circle = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
  );
  return sharp(logo).composite([{ input: circle, blend: "dest-in" }]).png().toBuffer();
}

/**
 * The logo on a full-bleed white field, zoomed so the wordmark fills the safe
 * zone and the ring is cropped away. Used for maskable icons (launcher applies
 * its own shape) and the apple-touch icon (iOS rounds the corners itself), so
 * the home-screen icon shows the whole logo edge-to-edge, not a small circle.
 */
async function onWhiteSquare(size, zoom = 1.16) {
  const logo = await fitLogo(size, zoom);
  const bg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${WHITE}"/>
    </svg>`
  );
  return sharp(bg).composite([{ input: logo }]).flatten({ background: WHITE }).png().toBuffer();
}

const outputs = [
  // purpose "any" — the round mark, transparent corners, wordmark enlarged
  { name: "icon-192.png", render: () => roundLogo(192) },
  { name: "icon-512.png", render: () => roundLogo(512) },
  { name: "services-icon.png", render: () => roundLogo(192) },
  { name: "projects-icon.png", render: () => roundLogo(192) },
  { name: "bookings-icon.png", render: () => roundLogo(192) },
  // purpose "maskable" — full-bleed white, logo fills; launcher masks the shape.
  // zoom 1.05 crops the ring but keeps the wordmark inside the circle safe zone.
  { name: "icon-maskable-192.png", render: () => onWhiteSquare(192, 1.05) },
  { name: "icon-maskable-512.png", render: () => onWhiteSquare(512, 1.05) },
  // iOS home screen — opaque, iOS rounds the corners (squircle keeps mid-edges)
  { name: "apple-touch-icon.png", render: () => onWhiteSquare(180, 1.08) },
];

for (const { name, render } of outputs) {
  await sharp(await render()).toFile(path.join(iconsDir, name));
  console.log(`Generated ${name}`);
}

await sharp(await roundLogo(32)).toFile(path.join(publicDir, "favicon-32.png"));
console.log("Generated favicon-32.png");

export { NAVY, NAVY_DEEP, GOLD, WHITE, fitLogo };
