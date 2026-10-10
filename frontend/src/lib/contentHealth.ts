import type { Product, Service, BlogPost, Category, Subcategory, PromoSlide } from "@/types";
import { getFlashSaleStatus } from "@/lib/flashSale";
import { slideLiveState } from "@/lib/promoSlideStatus";

/** One thing the owner should fix, with a link to the exact edit place. */
export interface HealthItem {
  key: string;
  label: string;
  href: string;
  note?: string;
}

export interface HealthGroup {
  id: string;
  titleBn: string;
  helpBn: string;
  items: HealthItem[];
}

export interface ContentHealthInput {
  products: Product[];
  services: Service[];
  posts: BlogPost[];
  categories: Category[];
  settings: Record<string, string>;
  slides: PromoSlide[];
  now?: number;
}

const blank = (v: unknown) => typeof v !== "string" || v.trim() === "";
const productName = (p: Product) => p.name_bn || p.name_en || p.slug;
const sid = (s: Service) => String(s.id ?? "");
const serviceName = (s: Service) => s.name_bn || s.name_en || sid(s);
const pid = (p: Product) => String(p.id ?? "");
const productHref = (p: Product) => `/sumon/products?edit=${encodeURIComponent(pid(p))}`;
const serviceHref = (s: Service) => `/sumon/services?edit=${encodeURIComponent(sid(s))}`;

type Node = Category | Subcategory;

/** Every category node (any depth) with no active product/service in it or below it. */
function emptyCategories(categories: Category[], products: Product[], services: Service[]): Node[] {
  const used = new Set<string>();
  for (const it of [...products, ...services] as (Product | Service)[]) {
    if (it.is_active === false) continue;
    if (it.category_id) used.add(it.category_id);
    if (it.subcategory_id) used.add(it.subcategory_id);
    if (typeof it.category === "string" && it.category) used.add(`slug:${it.category}`);
  }
  const out: Node[] = [];
  const walk = (n: Node): boolean => {
    let has = used.has(n.id) || used.has(`slug:${n.slug}`);
    for (const c of n.subcategories ?? []) if (walk(c)) has = true;
    if (!has && n.is_active !== false) out.push(n);
    return has;
  };
  categories.forEach(walk);
  return out;
}

export function buildContentHealth(input: ContentHealthInput): HealthGroup[] {
  const { settings, now = Date.now() } = input;
  // Hidden (inactive) items are not on the website, so they are skipped.
  const products = input.products.filter((p) => p.is_active !== false);
  const services = input.services.filter((s) => s.is_active !== false);

  const groups: HealthGroup[] = [];
  const push = (g: HealthGroup) => { if (g.items.length) groups.push(g); };

  // ── Homepage & settings ──
  const site: HealthItem[] = [];
  if (blank(settings.hero_image_url)) {
    site.push({ key: "hero-desktop", label: "হিরো ব্যানারে ডেস্কটপ ছবি নেই", href: "/sumon/homepage#hero" });
  }
  const liveHeroSlides = input.slides.filter((s) => s.placement === "hero" && slideLiveState(s, now) === "live");
  if (blank(settings.hero_mobile_image_url) && liveHeroSlides.length === 0) {
    site.push({ key: "hero-mobile", label: "মোবাইলে হিরো ছবি নেই (মোবাইল ব্যানার বা চালু স্লাইড কোনোটাই নেই)", href: "/sumon/homepage#hero" });
  }
  const fs = getFlashSaleStatus(settings, now);
  if (fs.state === "expired") {
    site.push({ key: "flash-expired", label: "ফ্ল্যাশ সেলের সময় শেষ — নতুন সময় দিন বা বন্ধ করুন", href: "/sumon/homepage#flash-sale" });
  } else if (fs.state === "invalid") {
    site.push({ key: "flash-invalid", label: "ফ্ল্যাশ সেলের শুরু/শেষ সময় ঠিক নেই", href: "/sumon/homepage#flash-sale" });
  }
  const contact = "/sumon/settings#company_info";
  if (blank(settings.contact_phone)) site.push({ key: "phone", label: "ফোন নম্বর দেওয়া নেই", href: contact });
  if (blank(settings.whatsapp_number) && blank(settings.contact_phone)) site.push({ key: "whatsapp", label: "হোয়াটসঅ্যাপ নম্বর দেওয়া নেই", href: contact });
  if (blank(settings.contact_hours_bn) && blank(settings.contact_hours_en)) site.push({ key: "hours", label: "খোলার সময় দেওয়া নেই", href: contact });
  if (blank(settings.contact_address) && blank(settings.contact_address_en)) site.push({ key: "address", label: "ঠিকানা দেওয়া নেই", href: contact });
  push({ id: "site", titleBn: "হোমপেজ ও যোগাযোগ তথ্য", helpBn: "ভিজিটর প্রথমেই এগুলো দেখে — আগে এগুলো ঠিক করুন।", items: site });

  // ── Products ──
  push({
    id: "product-photo", titleBn: "ছবি ছাড়া পণ্য", helpBn: "ছবি না থাকলে কেউ কিনতে চায় না।",
    items: products.filter((p) => blank(p.image_url) && !(p.images ?? []).some((u) => !blank(u)))
      .map((p) => ({ key: pid(p), label: productName(p), href: productHref(p) })),
  });
  push({
    id: "product-price", titleBn: "দাম ছাড়া পণ্য", helpBn: "দাম ০ বা খালি — ওয়েবসাইটে ভুল দাম দেখাবে।",
    items: products.filter((p) => !(Number(p.price) > 0))
      .map((p) => ({ key: pid(p), label: productName(p), href: productHref(p) })),
  });
  push({
    id: "product-desc", titleBn: "বিবরণ ছাড়া পণ্য", helpBn: "২-৩ লাইনের বিবরণ দিন — গুগলেও সহজে পাওয়া যায়।",
    items: products.filter((p) => blank(p.description_bn) && blank(p.description_en))
      .map((p) => ({ key: pid(p), label: productName(p), href: productHref(p) })),
  });
  push({
    id: "product-category", titleBn: "ক্যাটাগরি ছাড়া পণ্য", helpBn: "ক্যাটাগরি না থাকলে দোকানের মেনুতে পণ্যটি খুঁজে পাওয়া যায় না।",
    items: products.filter((p) => !p.category_id && blank(p.category))
      .map((p) => ({ key: pid(p), label: productName(p), href: productHref(p) })),
  });
  push({
    id: "product-stock", titleBn: "স্টক শেষ (০)", helpBn: "স্টক ০ — ভিজিটর অর্ডার করতে পারবে না। স্টক বাড়ান বা পণ্য লুকান।",
    items: products.filter((p) => p.stock_quantity === 0)
      .map((p) => ({ key: pid(p), label: productName(p), href: productHref(p) })),
  });

  // ── Services ──
  push({
    id: "service-desc", titleBn: "বিবরণ ছাড়া সেবা", helpBn: "সেবাটি কী, কত সময় লাগে — ছোট করে লিখুন।",
    items: services.filter((s) => [s.description_bn, s.description_en, s.short_description_bn, s.short_description_en, s.long_description_bn, s.long_description_en].every(blank))
      .map((s) => ({ key: sid(s), label: serviceName(s), href: serviceHref(s) })),
  });
  push({
    id: "service-image", titleBn: "ছবি ছাড়া সেবা", helpBn: "একটি পরিষ্কার ছবি দিন।",
    items: services.filter((s) => blank(s.featured_image_url) && blank(s.image_url))
      .map((s) => ({ key: sid(s), label: serviceName(s), href: serviceHref(s) })),
  });

  // ── Blog ──
  push({
    id: "blog-cover", titleBn: "কভার ছবি ছাড়া ব্লগ", helpBn: "কভার ছবি থাকলে ফেসবুকে শেয়ার করলে সুন্দর দেখায়।",
    items: input.posts.filter((b) => blank(b.featured_image_url))
      .map((b) => ({ key: b.id, label: b.title_bn || b.title_en || b.slug, href: `/sumon/blog?edit=${encodeURIComponent(b.id)}`, note: b.status === "draft" ? "খসড়া" : undefined })),
  });

  // ── Categories ──
  push({
    id: "category-empty", titleBn: "খালি ক্যাটাগরি", helpBn: "এই ক্যাটাগরিতে কোনো চালু পণ্য/সেবা নেই — ভিজিটর খালি পাতা দেখবে।",
    items: emptyCategories(input.categories, input.products, input.services)
      .map((c) => ({ key: c.id, label: c.name_bn || c.name_en || c.slug, href: "/sumon/categories" })),
  });

  return groups;
}
