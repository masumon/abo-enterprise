import { PAGE_BANNER_CONFIG, bannerSettingKey } from "@/lib/pageBanners";

/** Single CMS setting that stores one image URL. */
export interface ImageSlotDef {
  key: string;
  label: string;
  labelBn: string;
  hint?: string;
  usedOn?: string;
  /** Recommended dimensions + format, shown under the upload control. */
  guide?: string;
}

export const MEDIA_UPLOAD_FOLDER = "abo-enterprise/media";

export const BRAND_IMAGE_SLOTS: ImageSlotDef[] = [
  { key: "logo_url", label: "Site Logo", labelBn: "সাইট লোগো", usedOn: "Navbar, Footer, Hero, Invoice", guide: "512×512px (1:1) · PNG স্বচ্ছ ব্যাকগ্রাউন্ড" },
  { key: "favicon_url", label: "Favicon", labelBn: "ফ্যাভিকন", usedOn: "Browser tab icon", guide: "64×64px (1:1) · PNG/ICO" },
  { key: "app_icon_url", label: "PWA App Icon", labelBn: "PWA অ্যাপ আইকন", usedOn: "Mobile home screen, manifest", guide: "512×512px (1:1) · PNG" },
  { key: "default_og_image_url", label: "Default Social Share Image", labelBn: "সোশ্যাল শেয়ার ছবি", usedOn: "Facebook/Twitter preview fallback", guide: "1200×630px (1.91:1) · JPG/PNG" },
  { key: "hero_image_url", label: "Homepage Banner (Desktop)", labelBn: "হোমপেজ ব্যানার (ডেস্কটপ)", usedOn: "Homepage hero — desktop", guide: "1920×1080px (16:9) · JPG/WebP/MP4" },
  { key: "hero_mobile_image_url", label: "Homepage Banner (Mobile)", labelBn: "হোমপেজ ব্যানার (মোবাইল)", usedOn: "Homepage hero — mobile background", guide: "1080×1350px (পোর্ট্রেট) · ছবি/animated/MP4 · খালি রাখলে gradient" },
  { key: "hero_promo_media_url", label: "Hero Promo Media (auto-play)", labelBn: "হিরো প্রমো মিডিয়া (অটো-প্লে)", usedOn: "Homepage hero — promo card", guide: "যেকোন ছবি/animated/ভিডিও (MP4) · অটো-প্লে · খালি হলে ব্যানার ছবি দেখাবে" },
  { key: "site_login_bg_url", label: "Admin Login Background", labelBn: "অ্যাডমিন লগইন ব্যাকগ্রাউন্ড", usedOn: "/admin/login", guide: "1920×1080px (16:9) · ছবি, animated বা ভিডিও (MP4)" },
  { key: "site_customer_login_bg_url", label: "Customer Login Background", labelBn: "গ্রাহক লগইন ব্যাকগ্রাউন্ড", usedOn: "/login, /register", guide: "1920×1080px (16:9) · ছবি, animated বা ভিডিও (MP4)" },
  { key: "gallery_office_image_url", label: "Gallery Office Photo", labelBn: "গ্যালারি অফিস ছবি", usedOn: "/gallery office tab", guide: "1920×1080px (16:9) · JPG/WebP" },
  { key: "about_story_image_url", label: "About Story Image", labelBn: "আমাদের গল্প ছবি", usedOn: "/about Our Story", guide: "1200×800px (3:2) · JPG/WebP" },
];

export const PAGE_BANNER_SLOTS: ImageSlotDef[] = PAGE_BANNER_CONFIG.map(({ key, label, hint }) => ({
  key: bannerSettingKey(key),
  label: `${label} Banner`,
  labelBn: `${label} ব্যানার`,
  hint: hint ?? "Page hero background",
  usedOn: `/${key === "legal" ? "services/legal" : key === "printing" ? "services/printing" : key === "software" ? "services/software" : key}`,
  guide: "1920×600px (wide) · JPG/WebP",
}));

export const JSON_IMAGE_SETTINGS = {
  team: { key: "about_team_json", label: "About Team Photos", labelBn: "টিম সদস্যের ছবি", usedOn: "/about" },
  clients: { key: "client_logos_json", label: "Client Logos", labelBn: "ক্লায়েন্ট লোগো", usedOn: "Homepage" },
  showcaseProjects: { key: "showcase_projects_json", label: "Project Gallery", labelBn: "প্রজেক্ট গ্যালারি", usedOn: "/projects, /gallery" },
  showcaseServices: { key: "software_service_cards_json", label: "Software Service Cards", labelBn: "সফটওয়্যার সেবা কার্ড", usedOn: "/services/software" },
  demoReviews: { key: "demo_reviews_json", label: "Demo Review Avatars", labelBn: "ডেমো রিভিউ ছবি", usedOn: "Offline fallback" },
} as const;

export const CATALOG_IMAGE_SECTIONS = [
  { id: "products", label: "Products", labelBn: "পণ্য", adminHref: "/admin/products", imageField: "image_url", galleryField: "images", ogField: "og_image" },
  { id: "services", label: "Services", labelBn: "সেবা", adminHref: "/admin/services", imageField: "featured_image_url", iconField: "icon_url", ogField: "og_image" },
  { id: "blog", label: "Blog Posts", labelBn: "ব্লগ", adminHref: "/admin/blog", imageField: "featured_image_url", ogField: "og_image" },
  { id: "reviews", label: "Reviews", labelBn: "রিভিউ", adminHref: "/admin/reviews", imageField: "photo_url" },
] as const;

/** All single-URL setting keys managed from the media module. */
export function allSettingImageKeys(): string[] {
  return [...BRAND_IMAGE_SLOTS, ...PAGE_BANNER_SLOTS].map((s) => s.key);
}
