import { getSettingValue } from "@/hooks/usePublicSettings";

/** Page keys for admin-managed banner images (`banner_{key}_image_url`). */
export type PageBannerKey =
  | "about"
  | "products"
  | "services"
  | "blog"
  | "gallery"
  | "career"
  | "testimonials"
  | "contact"
  | "faq"
  | "shipping"
  | "projects"
  | "track"
  | "book"
  | "compare"
  | "printing"
  | "legal"
  | "software"
  | "cart"
  | "checkout"
  | "search"
  | "orders"
  | "privacy"
  | "terms"
  | "refund"
  | "profile";

export interface PageBannerMeta {
  key: PageBannerKey;
  label: string;
  hint?: string;
}

/** Admin settings fields — one image upload per page. Homepage uses `hero_image_url`. */
export const PAGE_BANNER_CONFIG: PageBannerMeta[] = [
  { key: "about", label: "About Us", hint: "Seeded via CMS — upload to replace" },
  { key: "products", label: "Products" },
  { key: "services", label: "Services" },
  { key: "blog", label: "Blog" },
  { key: "gallery", label: "Gallery" },
  { key: "career", label: "Careers" },
  { key: "testimonials", label: "Testimonials" },
  { key: "contact", label: "Contact" },
  { key: "faq", label: "FAQ" },
  { key: "shipping", label: "Shipping Info" },
  { key: "projects", label: "Custom Projects" },
  { key: "track", label: "Track Order" },
  { key: "book", label: "Book a Service" },
  { key: "compare", label: "Compare Products" },
  { key: "printing", label: "Printing Services" },
  { key: "legal", label: "Legal Services" },
  { key: "software", label: "Software & AI" },
  { key: "cart", label: "Shopping Cart" },
  { key: "checkout", label: "Checkout" },
  { key: "search", label: "Search" },
  { key: "orders", label: "My Orders" },
  { key: "privacy", label: "Privacy Policy" },
  { key: "terms", label: "Terms of Service" },
  { key: "refund", label: "Refund Policy" },
  { key: "profile", label: "User Profile" },
];

export function bannerSettingKey(pageKey: PageBannerKey): string {
  return `banner_${pageKey}_image_url`;
}

/** Admin upload wins; image URL must come from CMS settings (seeded in DB). */
export function resolvePageBannerImage(
  settings: Record<string, string>,
  pageKey: PageBannerKey
): string {
  return getSettingValue(settings, bannerSettingKey(pageKey));
}

export function resolveHomeBannerImage(settings: Record<string, string>): string {
  return getSettingValue(settings, "hero_image_url");
}
