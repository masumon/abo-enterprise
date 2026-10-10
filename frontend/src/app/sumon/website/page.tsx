"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight, BookOpen, ExternalLink, FileText, FolderKanban, FolderTree, HeartPulse, Images, LayoutTemplate,
  Package, Plus, ScrollText, ShieldCheck, Smartphone, Sparkles, Star, Wrench, type LucideIcon,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { BRAND_IMAGE_SLOTS } from "@/lib/imageRegistry";
import { useLanguageStore } from "@/store/language";
import api, { adminApi, adminBlogApi, adminPagesApi, categoriesAdminApi, productsApi, servicesAdminApi } from "@/lib/api";
import { aponAdminApi } from "@/lib/aponApi";
import { SHOWCASE_PROJECTS_KEY } from "@/lib/showcaseContent";

/** Live count + most recent change for one card (null on the record = failed, so the line is hidden). */
interface Stat { count: number | null; updated?: string | null; unit: string }

interface HubCard {
  id: string;
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  newHref?: string;
  view?: string;
  /** Extra small links (e.g. homepage sub-pages). */
  extra?: { href: string; label: string }[];
}

const CARDS: HubCard[] = [
  { id: "products", href: "/sumon/products", icon: Package, title: "পণ্য", desc: "দোকানের পণ্য — ছবি, দাম, স্টক ও বিবরণ", newHref: "/sumon/products?new=1", view: "/products" },
  { id: "services", href: "/sumon/services", icon: Wrench, title: "সেবা", desc: "সেবার বিবরণ, দাম ও বুকিং ফর্ম", newHref: "/sumon/services?new=1", view: "/services" },
  { id: "showcase", href: "/sumon/showcase", icon: FolderKanban, title: "সফটওয়্যার ও প্রজেক্ট", desc: "আপনার করা কাজ ও সফটওয়্যার সেবার নমুনা", newHref: "/sumon/showcase?new=1", view: "/projects" },
  { id: "categories", href: "/sumon/categories", icon: FolderTree, title: "ক্যাটাগরি", desc: "পণ্য ও সেবার ভাগ, ক্যাটাগরির ছবি ও ক্রম", newHref: "/sumon/categories?new=1", view: "/products" },
  { id: "blog", href: "/sumon/blog", icon: BookOpen, title: "ব্লগ", desc: "লেখা লিখুন, এক ক্লিকে ইংরেজি করুন, প্রকাশ করুন", newHref: "/sumon/blog?new=1", view: "/blog" },
  { id: "pages", href: "/sumon/pages", icon: FileText, title: "অতিরিক্ত পেজ", desc: "নিজের মতো পেজ (যেমন ওয়ারেন্টি, অফার)", newHref: "/sumon/pages?new=1" },
  { id: "homepage", href: "/sumon/homepage", icon: LayoutTemplate, title: "হোমপেজ সাজান", desc: "হিরো ব্যানার, লেখা ও হোমপেজের অংশগুলো", view: "/",
    extra: [{ href: "/sumon/promo-slides", label: "ব্যানার ও স্লাইডার" }, { href: "/sumon/announcements", label: "ঘোষণা বার" }] },
  { id: "about", href: "/sumon/about-trust", icon: ShieldCheck, title: "আমাদের সম্পর্কে ও বিশ্বাস", desc: "টিম সদস্য, ক্লায়েন্ট/পার্টনার লোগো, ব্যবসায়িক নিবন্ধন", newHref: "/sumon/about-trust#team", view: "/about" },
  { id: "reviews", href: "/sumon/reviews", icon: Star, title: "রিভিউ ও মতামত", desc: "পণ্য/সেবার রিভিউ ও সাইটের মতামত — দেখান, লুকান, টেস্ট রিভিউ মুছুন", newHref: "/sumon/reviews?new=1", view: "/testimonials" },
  { id: "media", href: "/sumon/media", icon: Images, title: "ছবি ও ভিডিও ভাণ্ডার", desc: "লোগো, হিরো ছবি/ভিডিও, পেজ ব্যানার ও সব আপলোড", newHref: "/sumon/media" },
  { id: "legal", href: "/sumon/legal-pages", icon: ScrollText, title: "আইনি পেজ", desc: "গোপনীয়তা, শর্ত, রিফান্ড ও কুকি নীতি (বাংলা ও ইংরেজি)", view: "/legal/privacy" },
  { id: "apon", href: "/sumon/apon", icon: Smartphone, title: "মোবাইল অ্যাপ (আপন)", desc: "অ্যাপের ভার্সন, ডাউনলোড পাতা ও স্ক্রিনশট", newHref: "/sumon/apon?new=1", view: "/apon" },
  { id: "health", href: "/sumon/content-health", icon: HeartPulse, title: "কনটেন্ট স্বাস্থ্য", desc: "ছবি নেই, অনুবাদ বাকি, ভাঙা লিংক — কী ঠিক করতে হবে এক নজরে" },
];

const bnNum = (n: number) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

type Row = { updated_at?: string | null; created_at?: string | null; uploaded_at?: string | null };
function latest(rows: unknown): string | null {
  let best: string | null = null;
  for (const r of (Array.isArray(rows) ? rows : []) as Row[]) {
    const t = r?.updated_at ?? r?.created_at ?? r?.uploaded_at ?? null;
    if (t && (!best || t > best)) best = t;
  }
  return best;
}
function arrLen(raw: string | undefined): number | null {
  if (!raw?.trim()) return 0;
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v.length : null; } catch { return null; }
}
type TreeNode = { subcategories?: TreeNode[] };
function countTree(nodes: TreeNode[]): number {
  return nodes.reduce((n, c) => n + 1 + countTree(c.subcategories ?? []), 0);
}
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric" });
}

/** Each loader uses an existing admin list endpoint; a failure just hides the count line.
 * "Last change" is the newest updated/created time among the first page of items. */
const LOADERS: Record<string, () => Promise<Stat>> = {
  products: async () => { const r = await productsApi.adminList({ page: 1, per_page: 20 }); return { count: r.data.meta?.total ?? null, updated: latest(r.data.data), unit: "টি পণ্য" }; },
  services: async () => { const r = await servicesAdminApi.list({ page: 1, per_page: 20 }); return { count: r.data.meta?.total ?? null, updated: latest(r.data.data), unit: "টি সেবা" }; },
  categories: async () => { const r = await categoriesAdminApi.list(); const d = (r.data.data ?? []) as unknown as TreeNode[]; return { count: countTree(d), updated: latest(d), unit: "টি ক্যাটাগরি" }; },
  blog: async () => { const r = await adminBlogApi.list({ page: 1, per_page: 20 }); return { count: r.data.meta?.total ?? null, updated: latest(r.data.data), unit: "টি লেখা" }; },
  pages: async () => { const r = await adminPagesApi.list({ page: 1, per_page: 20 }); return { count: r.data.meta?.total ?? null, updated: latest(r.data.data), unit: "টি পেজ" }; },
  reviews: async () => { const r = await api.get("/api/v1/reviews/admin", { params: { page: 1, per_page: 20 } }); return { count: Number(r.data?.meta?.total ?? 0), updated: latest(r.data?.data), unit: "টি রিভিউ ও মতামত" }; },
  media: async () => { const r = await adminApi.listMedia({ page: 1, per_page: 20 }); return { count: r.data.meta?.total ?? null, updated: latest(r.data.data), unit: "টি ফাইল" }; },
  apon: async () => { const r = await aponAdminApi.list(); const d = r.data.data ?? []; return { count: d.length, updated: latest(d), unit: "টি ভার্সন" }; },
};
const SETTINGS_CARDS = ["showcase", "about"];

export default function WebsiteHubPage() {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const sizes = BRAND_IMAGE_SLOTS.filter((s) => s.guide);
  const [stats, setStats] = useState<Record<string, Stat | null>>({});

  useEffect(() => {
    let alive = true;
    for (const [id, fn] of Object.entries(LOADERS)) {
      fn().then((st) => { if (alive) setStats((p) => ({ ...p, [id]: st })); })
        .catch(() => { if (alive) setStats((p) => ({ ...p, [id]: null })); });
    }
    // Settings-backed content (projects, team + client logos) — one request.
    adminApi.getSettings().then((r) => {
      if (!alive) return;
      const d = (r.data.data ?? {}) as Record<string, string>;
      const team = arrLen(d.about_team_json);
      const logos = arrLen(d.client_logos_json);
      setStats((p) => ({
        ...p,
        showcase: { count: arrLen(d[SHOWCASE_PROJECTS_KEY]), unit: "টি প্রজেক্ট (নিজের যোগ করা)" },
        about: { count: team == null || logos == null ? null : team + logos, unit: "টি সদস্য ও লোগো" },
      }));
    }).catch(() => { if (alive) setStats((p) => ({ ...p, showcase: null, about: null })); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Content hub"
        titleBn="কনটেন্ট-কেন্দ্র"
        description="Everything published on the site, in one place — counts, recent changes, add new, view on site."
        descriptionBn="সাইটে যা কিছু প্রকাশিত — সব এক জায়গায়: কতগুলো আছে, শেষ কবে বদলেছে, নতুন যোগ ও সাইটে দেখা।"
      />

      <div className="rounded-2xl border border-brand-100 bg-brand-50/60 dark:bg-white/5 dark:border-white/10 p-4 text-sm leading-relaxed flex gap-3">
        <Sparkles className="w-5 h-5 text-brand-600 dark:text-brand-300 flex-none mt-0.5" aria-hidden />
        <p>
          {bn
            ? "“খুলুন” চাপলে সেই অংশ খুলবে, “নতুন যোগ করুন” সরাসরি নতুন ফর্ম খোলে, “সাইটে দেখুন” লাইভ পাতা দেখায়। সংরক্ষণ করলেই সাইটে বদলে যায়।"
            : "“Open” manages a section, “Add new” opens the form directly, “View on site” opens the live page. Changes go live as soon as you save."}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {CARDS.map((c) => {
          const Icon = c.icon;
          const st = stats[c.id];
          const hasStat = c.id in LOADERS || SETTINGS_CARDS.includes(c.id);
          return (
            <div key={c.id} className="enterprise-card p-4 sm:p-5 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-white/10 dark:text-brand-300"><Icon className="w-5 h-5" aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-heading leading-snug"><Link href={c.href} className="hover:underline">{c.title}</Link></h2>
                  {hasStat && (
                    <p className="text-xs text-muted mt-0.5 min-h-[1rem]">
                      {st === undefined ? (
                        <span className="inline-block h-3 w-24 rounded bg-gray-200 dark:bg-white/10 animate-pulse align-middle" aria-label="লোড হচ্ছে" />
                      ) : st && st.count != null ? (
                        <>
                          <b className="text-heading tabular-nums">{bnNum(st.count)}</b>{st.unit}
                          {st.updated ? <> · শেষ বদল {fmtDate(st.updated)}</> : null}
                        </>
                      ) : null}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted leading-relaxed flex-1">{c.desc}</p>
              {c.extra && (
                <p className="text-xs text-muted -mt-1">
                  {c.extra.map((x, i) => (
                    <span key={x.href}>{i > 0 && " · "}<Link href={x.href} className="font-semibold text-brand-700 dark:text-brand-300 underline">{x.label}</Link></span>
                  ))}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Link href={c.href} className="btn btn-brand btn-sm gap-1.5">খুলুন<ArrowRight className="w-4 h-4" aria-hidden /></Link>
                {c.newHref && (
                  <Link href={c.newHref} className="btn btn-outline btn-sm gap-1.5"><Plus className="w-4 h-4" aria-hidden />{c.id === "media" ? "আপলোড করুন" : "নতুন যোগ করুন"}</Link>
                )}
                {c.view && (
                  <a href={c.view} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm gap-1.5"><ExternalLink className="w-4 h-4" aria-hidden />সাইটে দেখুন</a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="enterprise-card p-4 sm:p-5 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted">{bn ? "সাইটের নাম, ফোন, WhatsApp, ঠিকানা, ফুটার ও সোশ্যাল লিংক" : "Site name, phone, WhatsApp, address, footer and social links"}</p>
        <Link href="/sumon/settings" className="btn btn-outline btn-sm">{bn ? "সাইট সেটিংস →" : "Site settings →"}</Link>
      </div>

      <section className="enterprise-card p-4 sm:p-5" aria-labelledby="size-guide">
        <h2 id="size-guide" className="font-bold text-heading">{bn ? "ছবি-ভিডিও দেওয়ার সহজ নিয়ম" : "Picture & video cheat-sheet"}</h2>
        <ul className="mt-2 text-sm text-muted space-y-1 list-disc pl-5">
          <li>{bn ? "ছবি সর্বোচ্চ ৩০MB, ভিডিও সর্বোচ্চ ৫০MB। বড় ছবি নিজে ছোট ও দ্রুত করে নেওয়া হয়।" : "Pictures up to 30MB, videos up to 50MB. Large photos are optimised automatically."}</li>
          <li>{bn ? "আগে আপলোড করা ছবি আবার লাগলে “ভাণ্ডার থেকে নিন” চাপুন — নতুন করে আপলোড লাগে না।" : "To reuse an uploaded picture press “Browse Library” — no need to upload again."}</li>
          <li>{bn ? "নিচের মাপে দিলে ছবি সবচেয়ে সুন্দর দেখায়। মাপ কিছুটা এদিক-ওদিক হলেও সমস্যা নেই।" : "Pictures look best at the sizes below; slightly different sizes are fine."}</li>
        </ul>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm min-w-[32rem]">
            <thead>
              <tr className="text-left text-xs text-muted border-b border-[var(--line)]">
                <th className="py-2 pr-3 font-semibold">{bn ? "কোনটি" : "What"}</th>
                <th className="py-2 pr-3 font-semibold">{bn ? "কোথায় লাগে" : "Used on"}</th>
                <th className="py-2 font-semibold">{bn ? "প্রস্তাবিত মাপ" : "Recommended"}</th>
              </tr>
            </thead>
            <tbody>
              {sizes.map((s) => (
                <tr key={s.key} className="border-b border-[var(--line)] last:border-0 align-top">
                  <td className="py-2 pr-3 font-medium text-heading">{bn ? s.labelBn : s.label}</td>
                  <td className="py-2 pr-3 text-muted">{s.usedOn}</td>
                  <td className="py-2 text-muted">{s.guide}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">{bn ? "এই ছবিগুলো আপলোড করতে" : "To upload these, open"} <Link href="/sumon/media" className="font-semibold text-brand-700 dark:text-brand-300 underline">{bn ? "ছবি ও ভিডিও ভাণ্ডার" : "the Image Manager"}</Link>.</p>
      </section>
    </div>
  );
}
