import {
  LayoutDashboard, ShoppingCart, Briefcase, Package, Users, Wrench, FileText, Star, BookOpen, FolderKanban,
  Images, CreditCard, Bot, Mail, BarChart2, Settings, Shield, Send, Truck, UserPlus, Percent, FolderTree,
  LayoutTemplate, Megaphone, ExternalLink, UploadCloud, Tags, Bell, History, ScrollText, ShieldCheck, type LucideIcon,
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

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  { id: "overview", label: "Overview", labelBn: "সারাংশ", items: [
    { href: "/sumon", icon: LayoutDashboard, label: "Dashboard", labelBn: "ড্যাশবোর্ড", exact: true },
  ]},
  { id: "sales", label: "Sales", labelBn: "বিক্রয়", items: [
    { href: "/sumon/orders", icon: ShoppingCart, label: "Orders", labelBn: "অর্ডার", badge: "orders", permission: "orders.read" },
    { href: "/sumon/invoices", icon: FileText, label: "Invoices", labelBn: "ইনভয়েস", minRole: "admin", permission: "invoices.read" },
    { href: "/sumon/payments", icon: CreditCard, label: "Payments", labelBn: "পেমেন্ট", minRole: "admin", permission: "payments.read" },
  ]},
  { id: "catalog", label: "Catalog", labelBn: "ক্যাটালগ", items: [
    { href: "/sumon/categories", icon: FolderTree, label: "Categories", labelBn: "ক্যাটাগরি", minRole: "admin", permission: "products.read" },
    { href: "/sumon/products", icon: Package, label: "Products", labelBn: "পণ্য", exact: true, permission: "products.read" },
    { href: "/sumon/inventory", icon: Package, label: "Inventory", labelBn: "ইনভেন্টরি", minRole: "admin", permission: "products.read" },
    { href: "/sumon/inventory?tab=brands", icon: Tags, label: "Brands", labelBn: "ব্র্যান্ড", minRole: "admin", permission: "products.read" },
    { href: "/sumon/products/import", icon: UploadCloud, label: "Bulk Import", labelBn: "বাল্ক ইমপোর্ট", minRole: "admin", permission: "products.write" },
    { href: "/sumon/combos", icon: Package, label: "Combo Packs", labelBn: "কম্বো প্যাক", permission: "products.read" },
    { href: "/sumon/reviews", icon: Star, label: "Product Reviews", labelBn: "পণ্য রিভিউ", permission: "reviews.read" },
  ]},
  { id: "services", label: "Services", labelBn: "সেবা", items: [
    { href: "/sumon/services", icon: Wrench, label: "Services", labelBn: "সেবা", permission: "services.read" },
    { href: "/sumon/bookings", icon: Briefcase, label: "Bookings", labelBn: "বুকিং", badge: "bookings", permission: "bookings.read" },
  ]},
  { id: "customers-crm", label: "Customers & CRM", labelBn: "গ্রাহক ও CRM", items: [
    { href: "/sumon/customers", icon: Users, label: "Customers", labelBn: "গ্রাহক", minRole: "admin", permission: "customers.read" },
    { href: "/sumon/leads", icon: Users, label: "Leads", labelBn: "লিড", badge: "leads", permission: "leads.read" },
    { href: "/sumon/career", icon: UserPlus, label: "Career Applications", labelBn: "চাকরির আবেদন", minRole: "admin", permission: "career.read" },
  ]},
  { id: "marketing", label: "Marketing", labelBn: "মার্কেটিং", items: [
    { href: "/sumon/coupons", icon: Percent, label: "Coupons", labelBn: "কুপন", minRole: "admin" },
    { href: "/sumon/newsletter", icon: Send, label: "Newsletter", labelBn: "নিউজলেটার", minRole: "admin" },
  ]},
  { id: "content-brand", label: "Content & Brand", labelBn: "কনটেন্ট ও ব্র্যান্ড", items: [
    { href: "/sumon/homepage", icon: LayoutTemplate, label: "Homepage Content", labelBn: "হোমপেজ কনটেন্ট" },
    { href: "/sumon/announcements", icon: Megaphone, label: "Homepage Announcement Bar", labelBn: "ঘোষণা বার" },
    { href: "/sumon/promo-slides", icon: Images, label: "Homepage Banners & Slider", labelBn: "হোমপেজ ব্যানার ও স্লাইড", permission: "settings.read" },
    { href: "/sumon/media", icon: Images, label: "Image Manager", labelBn: "ছবি ব্যবস্থাপনা", permission: "media.read" },
    { href: "/sumon/showcase", icon: FolderKanban, label: "Project Gallery", labelBn: "প্রজেক্ট গ্যালারি" },
    { href: "/sumon/blog", icon: BookOpen, label: "Blog", labelBn: "ব্লগ", permission: "blog.read" },
    { href: "/sumon/pages", icon: FileText, label: "Pages", labelBn: "পেজ", permission: "pages.read" },
    { href: "/sumon/legal-pages", icon: ScrollText, label: "Legal Pages", labelBn: "আইনি পেজ", minRole: "admin", permission: "settings.write" },
    { href: "/sumon/email-templates", icon: Mail, label: "Email Templates", labelBn: "ইমেইল", minRole: "admin", permission: "email_templates.read" },
  ]},
  { id: "shipping-delivery", label: "Shipping & Delivery", labelBn: "শিপিং ও ডেলিভারি", items: [
    { href: "/sumon/delivery", icon: Truck, label: "Checkout & Delivery", labelBn: "চেকআউট ও ডেলিভারি", minRole: "admin", permission: "settings.write" },
    { href: "/sumon/delivery-zones", icon: Truck, label: "Delivery Zones", labelBn: "ডেলিভারি জোন", minRole: "admin", permission: "settings.read" },
    { href: "/sumon/settings#steadfast_courier", icon: Shield, label: "Courier (Steadfast)", labelBn: "কুরিয়ার (Steadfast)", minRole: "admin", permission: "settings.read" },
    { href: "/sumon/tracking", icon: Truck, label: "Tracking", labelBn: "ট্র্যাকিং", permission: "orders.read" },
    { href: "/sumon/steadfast-test", icon: Shield, label: "Steadfast Test", labelBn: "Steadfast টেস্ট", minRole: "admin", permission: "settings.read" },
  ]},
  { id: "finance-reports", label: "Finance & Reports", labelBn: "অর্থ ও রিপোর্ট", items: [
    { href: "/sumon/reports?report=revenue", icon: BarChart2, label: "Revenue", labelBn: "রেভিনিউ", minRole: "admin", permission: "analytics.read" },
    { href: "/sumon/reports", icon: ScrollText, label: "Sales Reports", labelBn: "বিক্রয় রিপোর্ট", minRole: "admin", permission: "analytics.read" },
    { href: "/sumon/reports?report=payments", icon: CreditCard, label: "Payment Reports", labelBn: "পেমেন্ট রিপোর্ট", minRole: "admin", permission: "analytics.read" },
    { href: "/sumon/payments?tab=reconciliation", icon: CreditCard, label: "Reconciliation", labelBn: "রিকনসিলিয়েশন", minRole: "admin", permission: "payments.read" },
  ]},
  { id: "analytics-operations", label: "Analytics & Operations", labelBn: "অ্যানালিটিক্স ও অপারেশনস", items: [
    { href: "/sumon/analytics", icon: BarChart2, label: "Analytics", labelBn: "অ্যানালিটিক্স" },
  ]},
  { id: "system-security", label: "System & Security", labelBn: "সিস্টেম ও নিরাপত্তা", items: [
    { href: "/sumon/settings", icon: Settings, label: "Settings", labelBn: "সেটিংস", minRole: "admin" },
    { href: "/sumon/settings#marketing_config", icon: Settings, label: "SEO", labelBn: "SEO", minRole: "admin" },
    { href: "/sumon/users", icon: Users, label: "Users", labelBn: "ইউজার", minRole: "admin", permission: "users.read" },
    { href: "/sumon/roles-permissions", icon: ShieldCheck, label: "Roles & Permissions", labelBn: "ভূমিকা ও অনুমতি", minRole: "admin", permission: "users.read" },
    { href: "/sumon/notifications", icon: Bell, label: "Notifications", labelBn: "নোটিফিকেশন" },
    { href: "/sumon/events", icon: History, label: "System Events", labelBn: "সিস্টেম ইভেন্ট", minRole: "admin", permission: "ops.read" },
    { href: "/sumon/audit", icon: Shield, label: "Audit Logs", labelBn: "অডিট", minRole: "admin", permission: "audit_logs.read" },
    { href: "/sumon/assistant", icon: Bot, label: "AI Assistant", labelBn: "AI সহকারী", minRole: "admin" },
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
  { href: "/sumon/settings", label: "Site Settings", labelBn: "সাইট সেটিংস", icon: Settings, color: "brand" as const },
  { href: "/sumon/analytics", label: "Analytics", labelBn: "রিপোর্ট", icon: BarChart2, color: "green" as const },
];
