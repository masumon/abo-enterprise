import {
  LayoutDashboard, ShoppingCart, Briefcase, Package, Users, Wrench, FileText, Star, BookOpen, FolderKanban,
  Images, CreditCard, Bot, Mail, BarChart2, Settings, Shield, Send, Truck, UserPlus, Percent, FolderTree,
  LayoutTemplate, Megaphone, ExternalLink, UploadCloud, Tags, Bell, History, ScrollText, ShieldCheck, Boxes,
  GalleryHorizontal, Smartphone, Sparkles, HeartPulse, type LucideIcon,
} from "lucide-react";

export type AdminRole = "super_admin" | "admin" | "editor" | "viewer";

export interface AdminNavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  labelBn?: string;
  exact?: boolean;
  external?: boolean;
  badge?: "orders" | "bookings" | "leads";
  minRole?: AdminRole;
  /** Dotted backend permission (app.core.rbac.ROLE_PERMISSIONS) this item's
   * page actually requires, e.g. "users.read". When set and a `permissions`
   * set is available (GET /admin/roles-permissions — the real source of
   * truth), this is checked instead of minRole, so nav visibility can't
   * drift out of sync with what the backend actually enforces. Items
   * without a mapped permission yet keep using minRole. */
  permission?: string;
  /** One plain-language line shown in search results. */
  descBn?: string;
  /** Extra search words (English + Bangla) so people find the page by what they call it. */
  keywords?: string;
}

const ROLE_LEVEL: Record<AdminRole, number> = { viewer: 0, editor: 1, admin: 2, super_admin: 3 };
export function canSeeNavItem(
  item: AdminNavItem,
  role: AdminRole | undefined,
  permissions?: string[],
): boolean {
  if (item.permission && permissions) {
    return permissions.includes("*") || permissions.includes(item.permission);
  }
  if (!item.minRole) return true;
  return (ROLE_LEVEL[role ?? "viewer"] ?? 0) >= ROLE_LEVEL[item.minRole];
}

export interface AdminNavGroup { id: string; label: string; labelBn?: string; items: AdminNavItem[]; }

/**
 * Grouped by what a shop owner is trying to do, not by how the system is built.
 * Every page that existed before is still here (same links, same permissions).
 * `keywords` feed the menu search and Ctrl+K, so typing "banner", "ব্যানার" or "লোগো"
 * finds the right page; `descBn` is the one-line plain-language help shown in search.
 */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  { id: "overview", label: "Overview", labelBn: "শুরু", items: [
    { href: "/sumon", icon: LayoutDashboard, label: "Dashboard", labelBn: "ড্যাশবোর্ড", exact: true, descBn: "আজকের অবস্থা ও দ্রুত কাজ এক নজরে", keywords: "home start শুরু হোম" },
  ]},
  { id: "daily", label: "Daily work", labelBn: "প্রতিদিনের কাজ", items: [
    { href: "/sumon/orders", icon: ShoppingCart, label: "Orders", labelBn: "অর্ডার", badge: "orders", permission: "orders.read", descBn: "নতুন অর্ডার দেখুন, নিশ্চিত করুন, পাঠান", keywords: "order অর্ডার বিক্রি" },
    { href: "/sumon/bookings", icon: Briefcase, label: "Bookings", labelBn: "সেবার বুকিং", badge: "bookings", permission: "bookings.read", descBn: "গ্রাহকের সেবা-বুকিং দেখুন ও সাড়া দিন", keywords: "booking বুকিং সেবা" },
    { href: "/sumon/leads", icon: Users, label: "Leads", labelBn: "নতুন আগ্রহী (লিড)", badge: "leads", permission: "leads.read", descBn: "যারা যোগাযোগ বা কোটেশন চেয়েছেন", keywords: "lead লিড কোটেশন আগ্রহী" },
    { href: "/sumon/customers", icon: Users, label: "Customers", labelBn: "গ্রাহক", minRole: "admin", permission: "customers.read", descBn: "গ্রাহকের তালিকা ও ইতিহাস", keywords: "customer গ্রাহক ক্রেতা" },
    { href: "/sumon/tracking", icon: Truck, label: "Tracking", labelBn: "অর্ডার ট্র্যাকিং", permission: "orders.read", descBn: "পার্সেল এখন কোথায় দেখুন", keywords: "tracking ট্র্যাক পার্সেল" },
    { href: "/sumon/career", icon: UserPlus, label: "Career Applications", labelBn: "চাকরির আবেদন", minRole: "admin", permission: "career.read", descBn: "চাকরির জন্য আসা আবেদন", keywords: "career job চাকরি আবেদন" },
    { href: "/sumon/notifications", icon: Bell, label: "Notifications", labelBn: "নোটিফিকেশন", descBn: "সাইট থেকে আসা সব বার্তা", keywords: "notification বার্তা" },
  ]},
  { id: "products-services", label: "Products & services", labelBn: "পণ্য ও সেবা", items: [
    { href: "/sumon/products", icon: Package, label: "Products", labelBn: "পণ্য", exact: true, permission: "products.read", descBn: "পণ্য যোগ, ছবি, দাম ও স্টক", keywords: "product পণ্য দাম ছবি" },
    { href: "/sumon/categories", icon: FolderTree, label: "Categories", labelBn: "ক্যাটাগরি", minRole: "admin", permission: "products.read", descBn: "পণ্য ও সেবার ক্যাটাগরি, ছবি, ক্রম ও দেখান/লুকান", keywords: "category subcategory ক্যাটাগরি সাব-ক্যাটাগরি ভাগ ক্রম" },
    { href: "/sumon/inventory", icon: Boxes, label: "Inventory & Product Brands", labelBn: "স্টক ও পণ্যের ব্র্যান্ড", minRole: "admin", permission: "products.read", descBn: "কোন পণ্য কতটা আছে; পণ্যের ব্র্যান্ড (যেমন Samsung)", keywords: "stock inventory brand manufacturer স্টক মজুত পণ্যের ব্র্যান্ড কোম্পানি" },
    { href: "/sumon/products/import", icon: UploadCloud, label: "Bulk Import", labelBn: "একসাথে অনেক পণ্য আপলোড", minRole: "admin", permission: "products.write", descBn: "Excel/CSV থেকে একসাথে পণ্য তুলুন", keywords: "import bulk csv excel আপলোড" },
    { href: "/sumon/combos", icon: Package, label: "Combo Packs", labelBn: "কম্বো প্যাক", permission: "products.read", descBn: "কয়েকটি পণ্য মিলিয়ে অফার", keywords: "combo কম্বো অফার প্যাক" },
    { href: "/sumon/services", icon: Wrench, label: "Services", labelBn: "সেবা", permission: "services.read", descBn: "সেবার বিবরণ, দাম ও বুকিং ফর্ম", keywords: "service সেবা" },
    { href: "/sumon/reviews", icon: Star, label: "Reviews & Testimonials", labelBn: "রিভিউ ও মতামত", permission: "reviews.read", descBn: "পণ্য/সেবার রিভিউ ও সাইটের মতামত — দেখান, লুকান, টেস্ট রিভিউ মুছুন", keywords: "review testimonial rating রিভিউ মতামত রেটিং টেস্টিমোনিয়াল গ্রাহকের কথা" },
  ]},
  { id: "website", label: "Make the website yours", labelBn: "ওয়েবসাইট সাজান", items: [
    { href: "/sumon/website", icon: Sparkles, label: "Content hub", labelBn: "কনটেন্ট-কেন্দ্র (সব এক জায়গায়)", exact: true, descBn: "সাইটের সব কনটেন্ট — সংখ্যা, শেষ বদল, নতুন যোগ, সাইটে দেখা", keywords: "website content hub cms কনটেন্ট কেন্দ্র সাজান সব" },
    { href: "/sumon/homepage", icon: LayoutTemplate, label: "Homepage Content", labelBn: "হোমপেজ (হিরো ব্যানার, লেখা)", descBn: "হোমপেজের বড় ব্যানার, লেখা, ছবি ও ভিডিও", keywords: "hero banner homepage হিরো ব্যানার হোম ভিডিও লোগো" },
    { href: "/sumon/promo-slides", icon: GalleryHorizontal, label: "Homepage Banners & Slider", labelBn: "ব্যানার ও স্লাইডার", permission: "settings.read", descBn: "অফারের ব্যানার ও ঘুরতে থাকা স্লাইড", keywords: "slider slide banner offer স্লাইড ব্যানার অফার" },
    { href: "/sumon/announcements", icon: Megaphone, label: "Homepage Announcement Bar", labelBn: "ঘোষণা বার (উপরের লেখা)", descBn: "সাইটের একদম উপরে চলমান ঘোষণা", keywords: "announcement ঘোষণা মার্কি ticker" },
    { href: "/sumon/about-trust", icon: ShieldCheck, label: "About & Trust", labelBn: "আমাদের সম্পর্কে ও বিশ্বাস", minRole: "admin", descBn: "টিম সদস্য, ক্লায়েন্ট/পার্টনার লোগো, ট্রেড লাইসেন্স ও নিবন্ধন", keywords: "about team member client partner logo trust registration trade license tin bin টিম সদস্য ক্লায়েন্ট পার্টনার লোগো ট্রেড লাইসেন্স নিবন্ধন সম্পর্কে" },
    { href: "/sumon/media", icon: Images, label: "Image Manager", labelBn: "ছবি ও ভিডিও ভাণ্ডার", permission: "media.read", descBn: "সব ছবি-ভিডিও আপলোড, দেখা ও মোছা", keywords: "image photo video upload media ছবি ভিডিও আপলোড" },
    { href: "/sumon/showcase", icon: FolderKanban, label: "Software & Projects", labelBn: "সফটওয়্যার ও প্রজেক্ট", descBn: "আপনার করা কাজ ও সফটওয়্যার সেবার নমুনা", keywords: "project gallery portfolio software showcase প্রজেক্ট গ্যালারি কাজ সফটওয়্যার" },
    { href: "/sumon/blog", icon: BookOpen, label: "Blog", labelBn: "ব্লগ", permission: "blog.read", descBn: "লেখা লিখুন, অনুবাদ ও প্রকাশ করুন", keywords: "blog post article ব্লগ লেখা" },
    { href: "/sumon/pages", icon: FileText, label: "Pages", labelBn: "অতিরিক্ত পেজ", permission: "pages.read", descBn: "নিজের মতো নতুন পেজ বানান", keywords: "page পেজ" },
    { href: "/sumon/apon", icon: Smartphone, label: "Mobile App (Apon)", labelBn: "মোবাইল অ্যাপ (আপন)", minRole: "admin", permission: "app.read", descBn: "অ্যাপের ভার্সন, ডাউনলোড পেজ ও পরিসংখ্যান", keywords: "app apk apon download অ্যাপ আপন ডাউনলোড" },
    { href: "/sumon/legal-pages", icon: ScrollText, label: "Legal Pages", labelBn: "আইনি পেজ (গোপনীয়তা, শর্ত)", minRole: "admin", permission: "settings.write", descBn: "প্রাইভেসি, শর্ত, রিফান্ড, কুকি", keywords: "legal privacy terms refund cookies গোপনীয়তা শর্ত রিফান্ড" },
    { href: "/sumon/content-health", icon: HeartPulse, label: "Content Health", labelBn: "কনটেন্ট স্বাস্থ্য", minRole: "admin", descBn: "ছবি নেই, অনুবাদ বাকি, ভাঙা লিংক — কী ঠিক করতে হবে", keywords: "content health missing image translation broken কনটেন্ট স্বাস্থ্য ছবি নেই অনুবাদ" },
    { href: "/sumon/settings", icon: Settings, label: "Settings", labelBn: "সাইট সেটিংস", minRole: "admin", descBn: "নাম, লোগো, ফোন, ঠিকানা, কুরিয়ার, Google/SEO, ইমেইল-SMS", keywords: "logo favicon contact phone address whatsapp courier steadfast seo google analytics pixel marketing smtp sms লোগো ফোন ঠিকানা হোয়াটসঅ্যাপ কুরিয়ার গুগল" },
  ]},
  { id: "marketing", label: "Marketing", labelBn: "প্রচার ও মার্কেটিং", items: [
    { href: "/sumon/coupons", icon: Percent, label: "Coupons", labelBn: "কুপন", minRole: "admin", descBn: "ছাড়ের কোড বানান", keywords: "coupon discount কুপন ছাড়" },
    { href: "/sumon/newsletter", icon: Send, label: "Newsletter", labelBn: "নিউজলেটার", minRole: "admin", descBn: "গ্রাহকদের ইমেইল পাঠান", keywords: "newsletter email নিউজলেটার" },
    { href: "/sumon/email-templates", icon: Mail, label: "Email Templates", labelBn: "অটো ইমেইলের লেখা", minRole: "admin", permission: "email_templates.read", descBn: "অর্ডার/বুকিংয়ে যে ইমেইল যায় তার লেখা", keywords: "email template ইমেইল টেমপ্লেট" },
  ]},
  { id: "delivery-payment", label: "Delivery & payment", labelBn: "ডেলিভারি ও পেমেন্ট", items: [
    { href: "/sumon/delivery", icon: Truck, label: "Checkout & Delivery", labelBn: "চেকআউট ও ডেলিভারি সেটিং", minRole: "admin", permission: "settings.write", descBn: "ডেলিভারি চার্জ, পেমেন্ট পদ্ধতি", keywords: "delivery checkout charge ডেলিভারি চার্জ" },
    { href: "/sumon/delivery-zones", icon: Truck, label: "Delivery Zones", labelBn: "ডেলিভারি এলাকা", minRole: "admin", permission: "settings.read", descBn: "কোন এলাকায় কত চার্জ", keywords: "zone area এলাকা জোন" },
    { href: "/sumon/payments", icon: CreditCard, label: "Payments", labelBn: "পেমেন্ট", minRole: "admin", permission: "payments.read", descBn: "কে কত টাকা দিল; পেমেন্ট ও অর্ডার মেলানো", keywords: "payment bkash nagad reconciliation পেমেন্ট বিকাশ নগদ মিলান হিসাব" },
    { href: "/sumon/invoices", icon: FileText, label: "Invoices", labelBn: "ইনভয়েস", minRole: "admin", permission: "invoices.read", descBn: "ইনভয়েস দেখুন ও প্রিন্ট করুন", keywords: "invoice ইনভয়েস বিল" },
  ]},
  { id: "reports", label: "Reports", labelBn: "রিপোর্ট ও হিসাব", items: [
    { href: "/sumon/analytics", icon: BarChart2, label: "Analytics", labelBn: "সাইটের পরিসংখ্যান", descBn: "কতজন এল, কী দেখল, কী কিনল", keywords: "analytics visitors পরিসংখ্যান ভিজিটর" },
    { href: "/sumon/reports", icon: ScrollText, label: "Sales Reports", labelBn: "রিপোর্ট (আয়, বিক্রয়, পেমেন্ট)", minRole: "admin", permission: "analytics.read", descBn: "দিন/মাসের আয়, কোন পণ্য কত বিক্রি, পেমেন্ট রিপোর্ট", keywords: "report revenue sales payments income রিপোর্ট আয় রেভিনিউ বিক্রয় পেমেন্ট" },
  ]},
  { id: "system-security", label: "System & Security", labelBn: "নিরাপত্তা ও ব্যবস্থাপনা", items: [
    { href: "/sumon/security", icon: ShieldCheck, label: "Account Security", labelBn: "আমার নিরাপত্তা (2FA)", descBn: "পাসওয়ার্ড, 2FA, রিকভারি কোড", keywords: "security 2fa password নিরাপত্তা পাসওয়ার্ড" },
    { href: "/sumon/users", icon: Users, label: "Users", labelBn: "অ্যাডমিন ব্যবহারকারী", minRole: "admin", permission: "users.read", descBn: "কে অ্যাডমিনে ঢুকতে পারবে", keywords: "user admin staff ইউজার কর্মী" },
    { href: "/sumon/roles-permissions", icon: ShieldCheck, label: "Roles & Permissions", labelBn: "কে কী করতে পারবে", minRole: "admin", permission: "users.read", descBn: "ভূমিকা ও অনুমতির তালিকা", keywords: "role permission ভূমিকা অনুমতি" },
    { href: "/sumon/help", icon: BookOpen, label: "Help Guide", labelBn: "সহায়তা গাইড", descBn: "ধাপে ধাপে বাংলা নির্দেশনা", keywords: "help guide সাহায্য গাইড" },
    { href: "/sumon/assistant", icon: Bot, label: "AI Assistant", labelBn: "AI সহকারী", minRole: "admin", descBn: "ওয়েবসাইটের চ্যাট সহকারীর সেটিং", keywords: "ai chatbot assistant সহকারী চ্যাট" },
    { href: "/sumon/audit", icon: Shield, label: "Audit Logs", labelBn: "কে কী বদলেছে (অডিট)", minRole: "admin", permission: "audit_logs.read", descBn: "অ্যাডমিনের কাজের ইতিহাস", keywords: "audit log ইতিহাস লগ" },
    { href: "/sumon/events", icon: History, label: "System Events", labelBn: "সিস্টেমের ঘটনা", minRole: "admin", permission: "ops.read", descBn: "সার্ভারের ত্রুটি ও সতর্কতা", keywords: "events error system ত্রুটি" },
  ]},
];

export const ADMIN_EXTERNAL_LINKS: AdminNavItem[] = [
  { href: "/", icon: ExternalLink, label: "View Website", labelBn: "ওয়েবসাইট", external: true },
  { href: "/blog", icon: ExternalLink, label: "View Blog", labelBn: "ব্লগ দেখুন", external: true },
  { href: "/projects", icon: ExternalLink, label: "Solutions", labelBn: "সলিউশন", external: true },
];

export const ADMIN_ALL_PAGES: AdminNavItem[] = [...ADMIN_NAV_GROUPS.flatMap((g) => g.items)];
export function getAdminPageTitle(pathname: string, lang: "en" | "bn" = "en"): string {
  if (pathname === "/sumon" || pathname === "/sumon/dashboard") return lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard";
  const match = ADMIN_ALL_PAGES.find((item) => item.exact ? pathname === item.href : pathname.startsWith(item.href));
  if (!match) return lang === "bn" ? "অ্যাডমিন" : "Admin";
  return lang === "bn" ? match.labelBn ?? match.label : match.label;
}

export const ADMIN_QUICK_ACTIONS = [
  { href: "/sumon/orders", label: "Pending Orders", labelBn: "অপেক্ষমান অর্ডার", icon: ShoppingCart, color: "brand" as const },
  { href: "/sumon/products", label: "Add Product", labelBn: "নতুন পণ্য", icon: Package, color: "green" as const },
  { href: "/sumon/bookings", label: "Bookings", labelBn: "বুকিং", icon: Briefcase, color: "accent" as const },
  { href: "/sumon/leads", label: "New Leads", labelBn: "নতুন লিড", icon: Users, color: "amber" as const },
  { href: "/sumon/customers", label: "Customers", labelBn: "গ্রাহক", icon: Users, color: "brand" as const },
  { href: "/sumon/analytics", label: "Analytics", labelBn: "রিপোর্ট", icon: BarChart2, color: "green" as const },
];

/** Everyday website-editing jobs, shown as big cards under the dashboard quick actions. */
export const ADMIN_WEBSITE_ACTIONS = [
  { href: "/sumon/homepage", label: "Hero banner & homepage", labelBn: "হিরো ব্যানার ও হোমপেজ", icon: LayoutTemplate, color: "brand" as const },
  { href: "/sumon/promo-slides", label: "Banners & slider", labelBn: "ব্যানার ও স্লাইডার", icon: GalleryHorizontal, color: "accent" as const },
  { href: "/sumon/media", label: "Upload photos & videos", labelBn: "ছবি-ভিডিও আপলোড", icon: Images, color: "green" as const },
  { href: "/sumon/blog", label: "Write a blog post", labelBn: "নতুন ব্লগ লিখুন", icon: BookOpen, color: "amber" as const },
  { href: "/sumon/announcements", label: "Announcement bar", labelBn: "ঘোষণা বার", icon: Megaphone, color: "brand" as const },
  { href: "/sumon/website", label: "Content hub", labelBn: "কনটেন্ট-কেন্দ্র", icon: Sparkles, color: "green" as const },
];
