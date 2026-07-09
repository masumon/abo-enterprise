import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
// logo.png is the canonical round brand mark: a circle inscribed full-bleed
// in a 512×512 square with transparent corners.
const logoPath = path.join(publicDir, "logo.png");
const iconsDir = path.join(publicDir, "icons");
const blueTop = "#2563a8";
const blueBottom = "#1e5ba8";

/** Round logo at `size`, re-masked to a crisp circle (transparent corners). */
async function roundLogo(size) {
  const resized = await sharp(logoPath).resize(size, size).png().toBuffer();
  const circle = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
  );
  return sharp(resized)
    .composite([{ input: circle, blend: "dest-in" }])
    .png()
    .toBuffer();
}

/**
 * Round logo centered on a full-bleed brand-blue square. Used for maskable
 * PWA icons (logo kept inside the 80% safe zone) and the apple-touch icon
 * (iOS applies its own corner mask, so the background must be opaque).
 */
async function onBrandSquare(size, logoRatio) {
  const inner = Math.round(size * logoRatio);
  const logo = await roundLogo(inner);
  const offset = Math.round((size - inner) / 2);
  const bg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${blueTop}"/>
          <stop offset="100%" stop-color="${blueBottom}"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#g)"/>
    </svg>`
  );
  return sharp(bg)
    .composite([{ input: logo, top: offset, left: offset }])
    .png()
    .toBuffer();
}

const outputs = [
  // purpose "any" — the round mark itself, transparent corners
  { name: "icon-192.png", render: () => roundLogo(192) },
  { name: "icon-512.png", render: () => roundLogo(512) },
  { name: "services-icon.png", render: () => roundLogo(192) },
  { name: "projects-icon.png", render: () => roundLogo(192) },
  { name: "bookings-icon.png", render: () => roundLogo(192) },
  // purpose "maskable" — full-bleed background, logo in the 80% safe zone
  { name: "icon-maskable-192.png", render: () => onBrandSquare(192, 0.8) },
  { name: "icon-maskable-512.png", render: () => onBrandSquare(512, 0.8) },
  // iOS home screen
  { name: "apple-touch-icon.png", render: () => onBrandSquare(180, 0.84) },
];

for (const { name, render } of outputs) {
  await sharp(await render()).toFile(path.join(iconsDir, name));
  console.log(`Generated ${name}`);
}

await sharp(await roundLogo(32)).toFile(path.join(publicDir, "favicon-32.png"));
console.log("Generated favicon-32.png");
