import {
  LayoutDashboard, ShoppingCart, Briefcase, Package, Users, Wrench, FileText, Star, BookOpen, FolderKanban,
  Images, CreditCard, Bot, Mail, BarChart2, Settings, Shield, Send, Truck, UserPlus, Percent, FolderTree,
  LayoutTemplate, Megaphone, ExternalLink, UploadCloud, Tags, type LucideIcon,
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
}

const ROLE_LEVEL: Record<AdminRole, number> = { viewer: 0, editor: 1, admin: 2, super_admin: 3 };
export function canSeeNavItem(item: AdminNavItem, role: AdminRole | undefined): boolean {
  if (!item.minRole) return true;
  return (ROLE_LEVEL[role ?? "viewer"] ?? 0) >= ROLE_LEVEL[item.minRole];
}

export interface AdminNavGroup { id: string; label: string; labelBn?: string; items: AdminNavItem[]; }

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  { id: "overview", label: "Overview", labelBn: "সারাংশ", items: [
    { href: "/sumon", icon: LayoutDashboard, label: "Dashboard", labelBn: "ড্যাশবোর্ড", exact: true },
    { href: "/sumon/analytics", icon: BarChart2, label: "Analytics", labelBn: "অ্যানালিটিক্স" },
  ]},
  { id: "sales", label: "Sales", labelBn: "বিক্রয়", items: [
    { href: "/sumon/orders", icon: ShoppingCart, label: "Orders", labelBn: "অর্ডার", badge: "orders" },
    { href: "/sumon/invoices", icon: FileText, label: "Invoices", labelBn: "ইনভয়েস", minRole: "admin" },
    { href: "/sumon/payments", icon: CreditCard, label: "Payments", labelBn: "পেমেন্ট", minRole: "admin" },
  ]},
  { id: "marketing", label: "Marketing", labelBn: "মার্কেটিং", items: [
    { href: "/sumon/coupons", icon: Percent, label: "Coupons", labelBn: "কুপন", minRole: "admin" },
    { href: "/sumon/newsletter", icon: Send, label: "Newsletter", labelBn: "নিউজলেটার", minRole: "admin" },
  ]},
  { id: "customers", label: "Customers", labelBn: "গ্রাহক", items: [
    { href: "/sumon/bookings", icon: Briefcase, label: "Bookings", labelBn: "বুকিং", badge: "bookings" },
    { href: "/sumon/leads", icon: Users, label: "Leads", labelBn: "লিড", badge: "leads" },
    { href: "/sumon/career", icon: UserPlus, label: "Career Applications", labelBn: "চাকরির আবেদন", minRole: "admin" },
  ]},
  { id: "catalog", label: "Catalog", labelBn: "ক্যাটালগ", items: [
    { href: "/sumon/categories", icon: FolderTree, label: "Categories", labelBn: "ক্যাটাগরি", minRole: "admin" },
    { href: "/sumon/products", icon: Package, label: "Products", labelBn: "পণ্য", exact: true },
    { href: "/sumon/inventory", icon: Package, label: "Inventory", labelBn: "ইনভেন্টরি", minRole: "admin" },
    { href: "/sumon/inventory?tab=brands", icon: Tags, label: "Brands", labelBn: "ব্র্যান্ড", minRole: "admin" },
    { href: "/sumon/products/import", icon: UploadCloud, label: "Bulk Import", labelBn: "বাল্ক ইমপোর্ট", minRole: "admin" },
    { href: "/sumon/combos", icon: Package, label: "Combo Packs", labelBn: "কম্বো প্যাক" },
    { href: "/sumon/services", icon: Wrench, label: "Services", labelBn: "সেবা" },
    { href: "/sumon/reviews", icon: Star, label: "Product Reviews", labelBn: "পণ্য রিভিউ" },
  ]},
  { id: "content", label: "Content", labelBn: "কনটেন্ট", items: [
    { href: "/sumon/homepage", icon: LayoutTemplate, label: "Homepage Content", labelBn: "হোমপেজ কনটেন্ট" },
    { href: "/sumon/announcements", icon: Megaphone, label: "Homepage Announcement Bar", labelBn: "ঘোষণা বার" },
    { href: "/sumon/promo-slides", icon: Images, label: "Homepage Banners & Slider", labelBn: "হোমপেজ ব্যানার ও স্লাইড" },
    { href: "/sumon/media", icon: Images, label: "Image Manager", labelBn: "ছবি ব্যবস্থাপনা" },
    { href: "/sumon/showcase", icon: FolderKanban, label: "Project Gallery", labelBn: "প্রজেক্ট গ্যালারি" },
    { href: "/sumon/blog", icon: BookOpen, label: "Blog", labelBn: "ব্লগ" },
    { href: "/sumon/email-templates", icon: Mail, label: "Email Templates", labelBn: "ইমেইল", minRole: "admin" },
  ]},
  { id: "system", label: "System", labelBn: "সিস্টেম", items: [
    { href: "/sumon/delivery", icon: Truck, label: "Checkout & Delivery", labelBn: "চেকআউট ও ডেলিভারি", minRole: "admin" },
    { href: "/sumon/delivery-zones", icon: Truck, label: "Delivery Zones", labelBn: "ডেলিভারি জোন", minRole: "admin" },
    { href: "/sumon/settings", icon: Settings, label: "Settings", labelBn: "সেটিংস", minRole: "admin" },
    { href: "/sumon/steadfast-test", icon: Shield, label: "Steadfast Test", labelBn: "Steadfast টেস্ট", minRole: "admin" },
    { href: "/sumon/users", icon: Users, label: "Users", labelBn: "ইউজার", minRole: "admin" },
    { href: "/sumon/audit", icon: Shield, label: "Audit Logs", labelBn: "অডিট", minRole: "admin" },
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
