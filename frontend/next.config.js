// @ts-check
const withPWA = require("next-pwa");

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  // Strip console.* from production bundles (keeps console.error for genuine
  // diagnostics). Development keeps all logging.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "i.ibb.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-Content-Type-Options",     value: "nosniff" },
          { key: "X-XSS-Protection",           value: "1; mode=block" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()" },
          { key: "Strict-Transport-Security",  value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https: http:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: https://www.google-analytics.com https://www.googletagmanager.com; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'self' https://www.google.com https://maps.google.com; child-src 'self' https://www.google.com https://maps.google.com; frame-ancestors 'none';",
          },
        ],
      },
      {
        source: "/icons/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/_next/static/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: true },
      { source: "/shop", destination: "/products", permanent: true },
      { source: "/dashboard", destination: "/profile", permanent: true },
      { source: "/admin/dashboard", destination: "/admin", permanent: true },
      { source: "/admin/revenue", destination: "/admin/analytics", permanent: true },
      { source: "/manifest.json", destination: "/manifest.webmanifest", permanent: false },
    ];
  },
};

module.exports = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline.html",
  },
  // Custom runtime caching — cross-origin backend API (Render) is intentionally
  // excluded so the browser's native fetch (60 s axios timeout) handles it
  // without the SW's 10 s timeout killing slow/mobile connections on cold start.
  runtimeCaching: [
    // Google Fonts — long-lived cache
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts-webfonts",
        expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "google-fonts-stylesheets",
        expiration: { maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
    // Next.js static chunks & CSS — immutable, cache forever
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "next-static",
        expiration: { maxEntries: 256, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    // Next.js Image Optimization
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-image",
        expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    // Static images / icons / logos
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-image-assets",
        expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    // Same-origin pages (no /api/ prefix)
    {
      urlPattern: ({ url, sameOrigin }) =>
        sameOrigin && !url.pathname.startsWith("/api/"),
      handler: "NetworkFirst",
      options: {
        cacheName: "pages",
        networkTimeoutSeconds: 45,
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    // Same-origin API routes (Next.js route handlers, if any)
    {
      urlPattern: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname.startsWith("/api/"),
      handler: "NetworkOnly",
      options: { cacheName: "same-origin-api" },
    },
    // NOTE: No catch-all for cross-origin.
    // Render backend (abo-enterprise.onrender.com) is cross-origin — SW does
    // NOT intercept it. Instead, use networkAwareApi wrapper at app level
    // which caches to IndexedDB for slow/mobile networks, while axios
    // timeout (adaptive: 30s fast, 60s+ slow) handles backend latency.
  ],
})(nextConfig);
