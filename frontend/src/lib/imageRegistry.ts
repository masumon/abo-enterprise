import { PAGE_BANNER_CONFIG, bannerSettingKey } from "@/lib/pageBanners";

/** Single CMS setting that stores one image URL. */
export interface ImageSlotDef {
  key: string;
  label: string;
  labelBn: string;
  hint?: string;
  usedOn?: string;
}

export const MEDIA_UPLOAD_FOLDER = "abo-enterprise/media";

export const BRAND_IMAGE_SLOTS: ImageSlotDef[] = [
  { key: "logo_url", label: "Site Logo", labelBn: "সাইট লোগো", usedOn: "Navbar, Footer, Hero, Invoice" },
  { key: "favicon_url", label: "Favicon", labelBn: "ফ্যাভিকন", usedOn: "Browser tab icon" },
  { key: "hero_image_url", label: "Homepage Banner", labelBn: "হোমপেজ ব্যানার", usedOn: "Homepage hero" },
  { key: "gallery_office_image_url", label: "Gallery Office Photo", labelBn: "গ্যালারি অফিস ছবি", usedOn: "/gallery office tab" },
  { key: "about_story_image_url", label: "About Story Image", labelBn: "আমাদের গল্প ছবি", usedOn: "/about Our Story" },
];

export const PAGE_BANNER_SLOTS: ImageSlotDef[] = PAGE_BANNER_CONFIG.map(({ key, label, hint }) => ({
  key: bannerSettingKey(key),
  label: `${label} Banner`,
  labelBn: `${label} ব্যানার`,
  hint: hint ?? "Page hero background",
  usedOn: `/${key === "legal" ? "services/legal" : key === "printing" ? "services/printing" : key === "software" ? "services/software" : key}`,
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
