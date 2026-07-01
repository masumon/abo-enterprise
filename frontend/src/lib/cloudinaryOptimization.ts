/**
 * Cloudinary URL optimization helpers
 * Provides WebP/AVIF delivery, responsive sizing, and smart optimization
 */

interface OptimizationConfig {
  width?: number;
  height?: number;
  quality?: "auto" | "high" | "good" | "eco" | "low";
  format?: "auto" | "webp" | "avif" | "jpg" | "png";
  dpr?: number;
  crop?: "fill" | "thumb" | "fit" | "scale";
  gravity?: "auto" | "face" | "center";
}

/**
 * Transform a Cloudinary URL with optimization parameters
 */
export function optimizeCloudinaryUrl(
  url: string,
  config: OptimizationConfig = {}
): string {
  if (!url || !url.includes("cloudinary.com")) {
    return url;
  }

  const {
    width,
    height,
    quality = "auto",
    format = "auto",
    dpr = 1,
    crop = "fill",
    gravity = "auto",
  } = config;

  const transformations: string[] = [];

  // Add format transformation (WebP/AVIF)
  if (format === "auto") {
    transformations.push("f_auto");
  } else {
    transformations.push(`f_${format}`);
  }

  // Add quality optimization
  transformations.push(`q_${quality}`);

  // Add DPR for responsive images
  if (dpr > 1) {
    transformations.push(`dpr_${dpr}`);
  }

  // Add sizing
  if (width && height) {
    transformations.push(`w_${width},h_${height},c_${crop},g_${gravity}`);
  } else if (width) {
    transformations.push(`w_${width},c_scale`);
  } else if (height) {
    transformations.push(`h_${height},c_scale`);
  }

  // Add fetch_format for best compression
  transformations.push("fl_progressive");

  const transformString = transformations.join("/");
  return url.replace("/upload/", `/upload/${transformString}/`);
}

/**
 * Generate responsive image srcSet for different screen densities
 */
export function generateResponsiveSrcSet(
  url: string,
  baseWidth: number
): string {
  if (!url.includes("cloudinary.com")) {
    return url;
  }

  const densities = [1, 1.5, 2];
  return densities
    .map((dpr) => {
      const optimized = optimizeCloudinaryUrl(url, {
        width: Math.round(baseWidth * dpr),
        format: "auto",
        quality: "auto",
      });
      return `${optimized} ${dpr}x`;
    })
    .join(", ");
}

/**
 * Generate srcSet for different viewport widths (art direction)
 */
export function generateArtDirectionSrcSet(
  url: string,
  sizes: Array<{ width: number; breakpoint: string }>
): string {
  if (!url.includes("cloudinary.com")) {
    return url;
  }

  return sizes
    .map(({ width, breakpoint }) => {
      const optimized = optimizeCloudinaryUrl(url, {
        width,
        format: "auto",
        quality: "auto",
      });
      return `${optimized} ${breakpoint}`;
    })
    .join(", ");
}

/**
 * Generate thumbnail with smart crop (face detection)
 */
export function generateThumbnail(
  url: string,
  size: number = 200
): string {
  return optimizeCloudinaryUrl(url, {
    width: size,
    height: size,
    crop: "thumb",
    gravity: "face",
    format: "auto",
    quality: "good",
  });
}

/**
 * Generate social media preview image
 */
export function generateOGImage(
  url: string,
  type: "landscape" | "square" = "landscape"
): string {
  const dimensions =
    type === "landscape"
      ? { width: 1200, height: 630 }
      : { width: 800, height: 800 };

  return optimizeCloudinaryUrl(url, {
    ...dimensions,
    crop: "fill",
    gravity: "auto",
    format: "auto",
    quality: "high",
  });
}

/**
 * Preload optimization - return best format for current browser
 */
export function getOptimalFormat(): "webp" | "avif" | "auto" {
  if (typeof window === "undefined") return "auto";

  const canvas = document.createElement("canvas");
  if (canvas.toDataURL("image/webp").startsWith("data:image/webp")) {
    return "webp";
  }
  // Note: AVIF detection is more complex, typically use "auto"
  return "auto";
}

/**
 * Common presets for different use cases
 */
export const OPTIMIZATION_PRESETS = {
  // Hero/Banner images
  hero: (url: string, width: number = 1920) => ({
    url: optimizeCloudinaryUrl(url, {
      width,
      quality: "high",
      format: "auto",
    }),
    srcSet: generateResponsiveSrcSet(url, width),
  }),

  // Product thumbnails
  thumbnail: (url: string) => ({
    url: generateThumbnail(url, 300),
    srcSet: generateResponsiveSrcSet(url, 300),
  }),

  // Product detail images
  productDetail: (url: string) => ({
    url: optimizeCloudinaryUrl(url, {
      width: 800,
      quality: "auto",
      format: "auto",
    }),
    srcSet: generateArtDirectionSrcSet(url, [
      { width: 400, breakpoint: "(max-width: 640px)" },
      { width: 800, breakpoint: "(max-width: 1280px)" },
      { width: 1200, breakpoint: "(min-width: 1281px)" },
    ]),
  }),

  // Social sharing
  socialShare: (url: string) => ({
    og: generateOGImage(url, "landscape"),
    twitter: generateOGImage(url, "square"),
  }),

  // Blog post images
  blog: (url: string) => ({
    url: optimizeCloudinaryUrl(url, {
      width: 800,
      quality: "auto",
      format: "auto",
    }),
    srcSet: generateResponsiveSrcSet(url, 800),
  }),
} as const;
