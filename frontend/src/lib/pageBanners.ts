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
  { key: "about", label: "About Us", hint: "Leave empty to use built-in demo banner" },
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

/** Built-in demo banners — shown until admin uploads a replacement. */
export const DEMO_PAGE_BANNERS: Record<PageBannerKey, string> = {
  about: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&q=80",
  products: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1600&q=80",
  services: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&q=80",
  blog: "https://images.unsplash.com/photo-1499750310158-5dc932a2d4e8?w=1600&q=80",
  gallery: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80",
  career: "https://images.unsplash.com/photo-1521737710472-2ce2a568e5d5?w=1600&q=80",
  testimonials: "https://images.unsplash.com/photo-1556745757-8d76bdb6834a?w=1600&q=80",
  contact: "https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=1600&q=80",
  faq: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1600&q=80",
  shipping: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=1600&q=80",
  projects: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1600&q=80",
  track: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=80",
  book: "https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=1600&q=80",
  compare: "https://images.unsplash.com/photo-1472851294607-062f824d29cc?w=1600&q=80",
  printing: "https://images.unsplash.com/photo-1562564055-71e051d33c19?w=1600&q=80",
  legal: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1600&q=80",
  software: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1600&q=80",
  cart: "https://images.unsplash.com/photo-1472851294607-062f824d29cc?w=1600&q=80",
  checkout: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1600&q=80",
  search: "https://images.unsplash.com/photo-1488590528505-98d2b5aba49b?w=1600&q=80",
  orders: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=80",
  privacy: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&q=80",
  terms: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&q=80",
  refund: "https://images.unsplash.com/photo-1554224311-beee415c201f?w=1600&q=80",
  profile: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1600&q=80",
};

export const DEMO_HOME_BANNER =
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80";

export function bannerSettingKey(pageKey: PageBannerKey): string {
  return `banner_${pageKey}_image_url`;
}

/** Admin upload wins; otherwise built-in demo image for the page. */
export function resolvePageBannerImage(
  settings: Record<string, string>,
  pageKey: PageBannerKey
): string {
  const admin = getSettingValue(settings, bannerSettingKey(pageKey));
  if (admin) return admin;
  return DEMO_PAGE_BANNERS[pageKey] ?? "";
}

export function resolveHomeBannerImage(settings: Record<string, string>): string {
  const admin = getSettingValue(settings, "hero_image_url");
  if (admin) return admin;
  return DEMO_HOME_BANNER;
}
