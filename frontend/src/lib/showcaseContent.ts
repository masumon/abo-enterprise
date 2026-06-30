import { getSettingValue } from "@/hooks/usePublicSettings";
import { PROJECTS, type ProjectCase } from "@/lib/data/projects";
import type { LucideIcon } from "lucide-react";
import { Bot, Code, Cog, Database, Globe, MonitorSmartphone } from "lucide-react";

export const SHOWCASE_PROJECTS_KEY = "showcase_projects_json";
export const SOFTWARE_SERVICE_CARDS_KEY = "software_service_cards_json";

export interface ShowcaseProject {
  id: string;
  slug: string;
  title: { en: string; bn: string };
  client: { en: string; bn: string };
  category: { en: string; bn: string };
  technologies: string[];
  problem: { en: string; bn: string };
  solution: { en: string; bn: string };
  result: { en: string; bn: string };
  image: string;
  images: string[];
  videoUrl?: string;
  liveUrl?: string;
  featured?: boolean;
  sortOrder?: number;
  year: number;
}

export interface SoftwareServiceCard {
  id: string;
  icon: string;
  color: string;
  title: { en: string; bn: string };
  image?: string;
  items: { en: string; bn: string }[];
  link?: string;
  videoUrl?: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  globe: Globe,
  bot: Bot,
  cog: Cog,
  database: Database,
  monitor: MonitorSmartphone,
  code: Code,
};

export function resolveServiceIcon(key: string): LucideIcon {
  return ICON_MAP[key] ?? Globe;
}

function projectToShowcase(p: ProjectCase, index: number): ShowcaseProject {
  return {
    id: p.slug,
    slug: p.slug,
    title: p.title,
    client: p.client,
    category: p.category,
    technologies: p.technologies,
    problem: p.problem,
    solution: p.solution,
    result: p.result,
    image: p.image,
    images: p.screenshots,
    year: p.year,
    sortOrder: index,
    featured: true,
  };
}

export const DEFAULT_SHOWCASE_PROJECTS: ShowcaseProject[] = PROJECTS.map(projectToShowcase);

export const DEFAULT_SOFTWARE_SERVICE_CARDS: SoftwareServiceCard[] = [
  {
    id: "website",
    icon: "globe",
    color: "from-green-500 to-teal-500",
    title: { en: "Website & Web App", bn: "ওয়েবসাইট ও ওয়েব অ্যাপ" },
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
    items: [
      { en: "Business websites", bn: "ব্যবসায়িক ওয়েবসাইট" },
      { en: "E-commerce platforms", bn: "ই-কমার্স প্ল্যাটফর্ম" },
      { en: "Web applications", bn: "ওয়েব অ্যাপ্লিকেশন" },
      { en: "PWA development", bn: "PWA ডেভেলপমেন্ট" },
    ],
  },
  {
    id: "ai",
    icon: "bot",
    color: "from-orange-500 to-red-500",
    title: { en: "AI Solutions", bn: "AI সমাধান" },
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80",
    items: [
      { en: "Custom AI agents", bn: "কাস্টম AI এজেন্ট" },
      { en: "OCR / Document processing", bn: "OCR / ডকুমেন্ট প্রসেসিং" },
      { en: "Chatbot integration", bn: "চ্যাটবট ইন্টিগ্রেশন" },
      { en: "Data extraction & analysis", bn: "ডেটা এক্সট্রাকশন" },
    ],
  },
  {
    id: "automation",
    icon: "cog",
    color: "from-indigo-500 to-purple-500",
    title: { en: "Python Automation", bn: "পাইথন অটোমেশন" },
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
    items: [
      { en: "Business process automation", bn: "ব্যবসায়িক প্রক্রিয়া স্বয়ংক্রিয়" },
      { en: "Data scraping & processing", bn: "ডেটা স্ক্র্যাপিং" },
      { en: "API integrations", bn: "API ইন্টিগ্রেশন" },
      { en: "Scheduled task automation", bn: "নির্ধারিত কাজ স্বয়ংক্রিয়" },
    ],
  },
  {
    id: "erp",
    icon: "database",
    color: "from-cyan-500 to-blue-500",
    title: { en: "ERP / POS / CRM", bn: "ERP / POS / CRM" },
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
    items: [
      { en: "Inventory management", bn: "ইনভেন্টরি ম্যানেজমেন্ট" },
      { en: "POS for retail & restaurant", bn: "রিটেইল ও রেস্টুরেন্ট POS" },
      { en: "ISP Billing system", bn: "ISP বিলিং সিস্টেম" },
      { en: "Hospital & school software", bn: "হাসপাতাল ও স্কুল সফটওয়্যার" },
    ],
  },
  {
    id: "mobile",
    icon: "monitor",
    color: "from-pink-500 to-rose-500",
    title: { en: "Mobile & Desktop Apps", bn: "মোবাইল ও ডেস্কটপ অ্যাপ" },
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80",
    items: [
      { en: "Android & iOS apps", bn: "Android ও iOS অ্যাপ" },
      { en: "Cross-platform apps", bn: "ক্রস-প্ল্যাটফর্ম অ্যাপ" },
      { en: "Desktop software", bn: "ডেস্কটপ সফটওয়্যার" },
      { en: "API backend development", bn: "API ব্যাকএন্ড" },
    ],
  },
  {
    id: "devops",
    icon: "code",
    color: "from-violet-500 to-purple-500",
    title: { en: "DevOps & Cloud", bn: "DevOps ও ক্লাউড" },
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80",
    items: [
      { en: "Docker & containerization", bn: "Docker কন্টেইনারাইজেশন" },
      { en: "Cloud deployment (AWS/GCP)", bn: "ক্লাউড ডিপ্লয়মেন্ট" },
      { en: "CI/CD pipeline setup", bn: "CI/CD পাইপলাইন" },
      { en: "Hosting & maintenance", bn: "হোস্টিং ও মেইনটেন্যান্স" },
    ],
  },
];

function parseJsonArray<T>(raw: string | undefined, fallback: T[]): T[] {
  if (!raw?.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function getShowcaseProjects(settings: Record<string, string>): ShowcaseProject[] {
  const list = parseJsonArray(
    getSettingValue(settings, SHOWCASE_PROJECTS_KEY),
    DEFAULT_SHOWCASE_PROJECTS
  );
  return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function getShowcaseProject(settings: Record<string, string>, slug: string): ShowcaseProject | undefined {
  return getShowcaseProjects(settings).find((p) => p.slug === slug);
}

export function getSoftwareServiceCards(settings: Record<string, string>): SoftwareServiceCard[] {
  return parseJsonArray(
    getSettingValue(settings, SOFTWARE_SERVICE_CARDS_KEY),
    DEFAULT_SOFTWARE_SERVICE_CARDS
  );
}

/** YouTube / Vimeo / direct video URL → embed src */
export function toVideoEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const ytMatch =
    trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/) ??
    trimmed.match(/youtube\.com\/shorts\/([\w-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  if (/vimeo\.com\/(\d+)/.test(trimmed)) {
    const id = trimmed.match(/vimeo\.com\/(\d+)/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (/\.(mp4|webm|mov)(\?|$)/i.test(trimmed)) return trimmed;
  return trimmed.includes("embed") ? trimmed : null;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
