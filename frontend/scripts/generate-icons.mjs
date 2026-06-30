import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const logoPath = path.join(publicDir, "logo.jpg");
const iconsDir = path.join(publicDir, "icons");
const brandBlue = "#1e5ba8";

const outputs = [
  { name: "icon-192.png", size: 192, maskable: false },
  { name: "icon-512.png", size: 512, maskable: false },
  { name: "icon-maskable-192.png", size: 192, maskable: true },
  { name: "icon-maskable-512.png", size: 512, maskable: true },
  { name: "apple-touch-icon.png", size: 180, maskable: false },
  { name: "services-icon.png", size: 192, maskable: false },
  { name: "projects-icon.png", size: 192, maskable: false },
  { name: "bookings-icon.png", size: 192, maskable: false },
];

async function renderIcon(size, maskable) {
  const padding = maskable ? Math.round(size * 0.12) : Math.round(size * 0.1);
  const inner = size - padding * 2;
  const logo = await sharp(logoPath)
    .resize(inner, inner, { fit: "cover" })
    .png()
    .toBuffer();

  const radius = maskable ? 0 : Math.round(size * 0.2);

  if (maskable) {
    const bg = Buffer.from(
      `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="${brandBlue}"/></svg>`
    );
    return sharp(bg).composite([{ input: logo, top: padding, left: padding }]).png();
  }

  const bg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#2563a8"/>
          <stop offset="100%" style="stop-color:#1e5ba8"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${radius}" fill="url(#g)"/>
      <rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="${radius - 1}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
    </svg>`
  );
  return sharp(bg).composite([{ input: logo, top: padding, left: padding }]).png();
}

for (const { name, size, maskable } of outputs) {
  const img = await renderIcon(size, maskable);
  await img.toFile(path.join(iconsDir, name));
  console.log(`Generated ${name}`);
}

await sharp(logoPath).resize(32, 32, { fit: "cover" }).png().toFile(path.join(publicDir, "favicon-32.png"));
console.log("Generated favicon-32.png");
