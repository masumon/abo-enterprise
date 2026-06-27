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
  const padding = maskable ? Math.round(size * 0.12) : Math.round(size * 0.08);
  const inner = size - padding * 2;
  const logo = await sharp(logoPath).resize(inner, inner, { fit: "cover" }).png().toBuffer();

  if (maskable) {
    const bg = Buffer.from(
      `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="${brandBlue}"/></svg>`
    );
    return sharp(bg).composite([{ input: logo, top: padding, left: padding }]).png();
  }

  const bg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="${brandBlue}"/></svg>`
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
