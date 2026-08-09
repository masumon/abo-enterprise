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

/**
 * Returns a responsive Cloudinary delivery URL without changing the stored
 * original asset. Non-Cloudinary URLs are returned unchanged so legacy/manual
 * URLs keep working.
 */
export function responsiveMediaUrl(
  value: string,
  preset: ResponsiveMediaPreset,
  viewport: "desktop" | "tablet" | "mobile"
): string {
  const url = value.trim();
  if (!url || !isCloudinaryImageUrl(url)) return url;

  const { width, height } = PRESETS[preset][viewport];
  const transformation = `f_auto,q_auto,dpr_auto,c_fill,g_auto,w_${width},h_${height}`;
  return url.replace("/image/upload/", `/image/upload/${transformation}/`);
}

export function responsiveMediaDimensions(preset: ResponsiveMediaPreset) {
  return PRESETS[preset];
}
