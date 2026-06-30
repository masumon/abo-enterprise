import {
  LayoutDashboard,
  ShoppingCart,
  Briefcase,
  Package,
  Users,
  Wrench,
  FileText,
  Star,
  BookOpen,
  CreditCard,
  Bot,
  Mail,
  BarChart2,
  Settings,
  Shield,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  labelBn?: string;
  exact?: boolean;
  external?: boolean;
  badge?: "orders" | "bookings" | "leads";
}

export interface AdminNavGroup {
  id: string;
  label: string;
  labelBn?: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    labelBn: "সারাংশ",
    items: [
      { href: "/admin", icon: LayoutDashboard, label: "Dashboard", labelBn: "ড্যাশবোর্ড", exact: true },
      { href: "/admin/analytics", icon: BarChart2, label: "Analytics", labelBn: "অ্যানালিটিক্স" },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    labelBn: "বিক্রয়",
    items: [
      { href: "/admin/orders", icon: ShoppingCart, label: "Orders", labelBn: "অর্ডার", badge: "orders" },
      { href: "/admin/invoices", icon: FileText, label: "Invoices", labelBn: "ইনভয়েস" },
      { href: "/admin/payments", icon: CreditCard, label: "Payments", labelBn: "পেমেন্ট" },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    labelBn: "গ্রাহক",
    items: [
      { href: "/admin/bookings", icon: Briefcase, label: "Bookings", labelBn: "বুকিং", badge: "bookings" },
      { href: "/admin/leads", icon: Users, label: "Leads", labelBn: "লিড", badge: "leads" },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    labelBn: "ক্যাটালগ",
    items: [
      { href: "/admin/products", icon: Package, label: "Products", labelBn: "পণ্য" },
      { href: "/admin/services", icon: Wrench, label: "Services", labelBn: "সেবা" },
      { href: "/admin/reviews", icon: Star, label: "Reviews", labelBn: "রিভিউ" },
    ],
  },
  {
    id: "content",
    label: "Content",
    labelBn: "কনটেন্ট",
    items: [
      { href: "/admin/blog", icon: BookOpen, label: "Blog", labelBn: "ব্লগ" },
      { href: "/admin/email-templates", icon: Mail, label: "Email Templates", labelBn: "ইমেইল" },
    ],
  },
  {
    id: "system",
    label: "System",
    labelBn: "সিস্টেম",
    items: [
      { href: "/admin/settings", icon: Settings, label: "Settings", labelBn: "সেটিংস" },
      { href: "/admin/users", icon: Users, label: "Users", labelBn: "ইউজার" },
      { href: "/admin/audit", icon: Shield, label: "Audit Logs", labelBn: "অডিট" },
      { href: "/admin/assistant", icon: Bot, label: "AI Assistant", labelBn: "AI সহকারী" },
    ],
  },
];

export const ADMIN_EXTERNAL_LINKS: AdminNavItem[] = [
  { href: "/", icon: ExternalLink, label: "View Website", labelBn: "ওয়েবসাইট", external: true },
  { href: "/blog", icon: ExternalLink, label: "View Blog", labelBn: "ব্লগ দেখুন", external: true },
  { href: "/projects", icon: ExternalLink, label: "Solutions", labelBn: "সলিউশন", external: true },
];

/** Flat list for breadcrumbs / search */
export const ADMIN_ALL_PAGES: AdminNavItem[] = [
  ...ADMIN_NAV_GROUPS.flatMap((g) => g.items),
];

export function getAdminPageTitle(pathname: string): string {
  if (pathname === "/admin" || pathname === "/admin/dashboard") return "Dashboard";
  const match = ADMIN_ALL_PAGES.find((item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)
  );
  return match?.label ?? "Admin";
}

export const ADMIN_QUICK_ACTIONS = [
  { href: "/admin/orders", label: "Pending Orders", labelBn: "অপেক্ষমান অর্ডার", icon: ShoppingCart, color: "brand" as const },
  { href: "/admin/products", label: "Add Product", labelBn: "নতুন পণ্য", icon: Package, color: "green" as const },
  { href: "/admin/bookings", label: "Bookings", labelBn: "বুকিং", icon: Briefcase, color: "accent" as const },
  { href: "/admin/leads", label: "New Leads", labelBn: "নতুন লিড", icon: Users, color: "amber" as const },
  { href: "/admin/settings", label: "Site Settings", labelBn: "সাইট সেটিংস", icon: Settings, color: "brand" as const },
  { href: "/admin/analytics", label: "Analytics", labelBn: "রিপোর্ট", icon: BarChart2, color: "green" as const },
];
