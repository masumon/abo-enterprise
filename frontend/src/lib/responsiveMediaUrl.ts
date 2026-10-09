export type ResponsiveMediaPreset = "page-banner" | "hero" | "wide" | "square" | "card";

type Dimensions = { width: number; height: number };

const PRESETS: Record<ResponsiveMediaPreset, { desktop: Dimensions; tablet: Dimensions; mobile: Dimensions }> = {
  "page-banner": {
    desktop: { width: 1920, height: 600 },
    tablet: { width: 1280, height: 500 },
    mobile: { width: 768, height: 420 },
  },
  hero: {
    desktop: { width: 1920, height: 800 },
    tablet: { width: 1280, height: 650 },
    mobile: { width: 768, height: 620 },
  },
  wide: {
    desktop: { width: 1600, height: 900 },
    tablet: { width: 1200, height: 675 },
    mobile: { width: 768, height: 432 },
  },
  square: {
    desktop: { width: 900, height: 900 },
    tablet: { width: 700, height: 700 },
    mobile: { width: 600, height: 600 },
  },
  card: {
    desktop: { width: 900, height: 675 },
    tablet: { width: 700, height: 525 },
    mobile: { width: 600, height: 450 },
  },
};

function isCloudinaryImageUrl(value: string): boolean {
  return /^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//i.test(value);
}

function hasResponsiveTransform(value: string): boolean {
  return /\/image\/upload\/f_auto,q_auto,dpr_auto,c_fill,g_auto,w_\d+,h_\d+\//i.test(value);
}

/**
 * Returns a responsive Cloudinary delivery URL without changing the stored
 * original asset. Non-Cloudinary and already-transformed URLs are returned
 * unchanged so legacy/manual URLs and composed delivery URLs keep working.
 */
export function responsiveMediaUrl(
  value: string,
  preset: ResponsiveMediaPreset,
  viewport: "desktop" | "tablet" | "mobile"
): string {
  const url = value.trim();
  if (!url || !isCloudinaryImageUrl(url) || hasResponsiveTransform(url)) return url;

  const { width, height } = PRESETS[preset][viewport];
  const transformation = `f_auto,q_auto,dpr_auto,c_fill,g_auto,w_${width},h_${height}`;
  return url.replace("/image/upload/", `/image/upload/${transformation}/`);
}

export function responsiveMediaDimensions(preset: ResponsiveMediaPreset) {
  return PRESETS[preset];
}

/**
 * Width-limited Cloudinary delivery URL (keeps the original aspect ratio, never
 * upscales): `f_auto,q_auto,c_limit,w_{width}`. Non-Cloudinary URLs are
 * returned unchanged.
 */
export function cloudinaryWidthUrl(value: string, width: number): string {
  const url = value.trim();
  if (!url || !isCloudinaryImageUrl(url)) return url;
  return url.replace("/image/upload/", `/image/upload/f_auto,q_auto,c_limit,w_${width}/`);
}

/** `srcset` string for a Cloudinary image at the given widths, or undefined
 * for non-Cloudinary URLs (callers then use the plain `src`). */
export function cloudinarySrcSet(value: string, widths: number[]): string | undefined {
  const url = value.trim();
  if (!url || !isCloudinaryImageUrl(url)) return undefined;
  return widths.map((w) => `${cloudinaryWidthUrl(url, w)} ${w}w`).join(", ");
}

/** Homepage desktop hero background widths (≥1024px viewports, 1x–2x). */
export const HERO_BG_WIDTHS = [1280, 1600, 1920, 2560];
/** Promo card / slider widths (448px card on desktop, full width on mobile). */
export const PROMO_WIDTHS = [480, 720, 960, 1280];
