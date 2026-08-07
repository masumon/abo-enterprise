import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import { NAVY, NAVY_DEEP, GOLD, fitLogo } from "./generate-icons.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const splashDir = path.join(publicDir, "splash");

// iOS PWA launch screens. iOS shows a blank white screen on launch unless the
// app ships a startup image per device size (referenced from layout.tsx's
// appleWebApp.startupImage). These are the exact sizes that layout lists.
const SIZES = [
  [640, 1136], [750, 1334], [828, 1792], [1080, 2340], [1125, 2436],
  [1170, 2532], [1179, 2556], [1242, 2688], [1284, 2778], [1290, 2796],
  [1536, 2048], [1668, 2388], [2048, 2732],
];

/** The logo as a crisp white disc at `d` px (transparent corners). */
async function logoDisc(d) {
  const logo = await fitLogo(d, 1.08);
  const circle = Buffer.from(
    `<svg width="${d}" height="${d}" xmlns="http://www.w3.org/2000/svg"><circle cx="${d / 2}" cy="${d / 2}" r="${d / 2}" fill="#fff"/></svg>`
  );
  return sharp(logo).composite([{ input: circle, blend: "dest-in" }]).png().toBuffer();
}

/**
 * Premium brand splash: a deep navy vertical gradient, a soft gold glow behind
 * the mark, the white logo disc framed by a thin gold ring, and a small gold
 * wordmark beneath. Matches the app's navy + gold identity so the launch feels
 * like part of the product, not a bare white flash.
 */
async function renderSplash(w, h) {
  const s = Math.min(w, h);
  const disc = Math.round(s * 0.4);        // logo diameter
  const R = disc / 2;
  const sw = Math.max(3, Math.round(disc * 0.018)); // gold ring stroke
  const ringR = R + Math.max(7, Math.round(disc * 0.05));
  const glowR = Math.round(disc * 0.95);
  const cx = w / 2;
  const cy = Math.round(h * 0.46);         // a touch above centre
  const wordY = cy + ringR + Math.round(s * 0.09);
  const fontSize = Math.round(s * 0.052);

  const bg = Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${NAVY}"/>
          <stop offset="55%" stop-color="${NAVY}"/>
          <stop offset="100%" stop-color="${NAVY_DEEP}"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${GOLD}" stop-opacity="0.30"/>
          <stop offset="55%" stop-color="${GOLD}" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#bg)"/>
      <circle cx="${cx}" cy="${cy}" r="${glowR}" fill="url(#glow)"/>
      <circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="${GOLD}" stroke-width="${sw}" stroke-opacity="0.9"/>
      <circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.18"/>
      <text x="${cx}" y="${wordY}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
            font-size="${fontSize}" font-weight="700" letter-spacing="${Math.round(fontSize * 0.18)}"
            fill="${GOLD}">ABO ENTERPRISE</text>
    </svg>`
  );

  const discBuf = await logoDisc(disc);
  return sharp(bg)
    .composite([{ input: discBuf, top: Math.round(cy - R), left: Math.round(cx - R) }])
    .png()
    .toBuffer();
}

for (const [w, h] of SIZES) {
  const out = path.join(splashDir, `apple-splash-${w}x${h}.png`);
  await sharp(await renderSplash(w, h)).toFile(out);
  console.log(`Generated apple-splash-${w}x${h}.png`);
}
