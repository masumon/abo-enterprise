"use client";

import Link from "next/link";
import {
  ArrowRight, BookOpen, Briefcase, ExternalLink, FolderKanban, GalleryHorizontal, Image as ImageIcon, Images, LayoutTemplate,
  Megaphone, Phone, ScrollText, Smartphone, Sparkles, type LucideIcon,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { BRAND_IMAGE_SLOTS } from "@/lib/imageRegistry";
import { useLanguageStore } from "@/store/language";

interface Spot {
  href: string;
  icon: LucideIcon;
  title: string;
  titleBn: string;
  /** Where visitors see the result. */
  where: string;
  whereBn: string;
  /** What you can change here. */
  what: string;
  whatBn: string;
  view?: string;
}

const SPOTS: Spot[] = [
  { href: "/sumon/homepage", icon: LayoutTemplate, title: "Hero banner text & buttons", titleBn: "হিরো ব্যানারের লেখা ও বাটন", where: "Top of the homepage", whereBn: "হোমপেজের একদম উপরে", what: "Headline, sub-text, button, text colours, homepage sections", whatBn: "বড় শিরোনাম, ছোট লেখা, বাটন, লেখার রং, হোমপেজের বিভিন্ন অংশ", view: "/" },
  { href: "/sumon/media", icon: Images, title: "Hero picture / video, logo, favicon", titleBn: "হিরো ছবি/ভিডিও, লোগো, ফেভিকন", where: "Homepage banner, every page header, browser tab", whereBn: "হোমপেজের ব্যানার, সব পেজের মাথা, ব্রাউজার ট্যাব", what: "Upload or replace the main pictures and videos of the site (desktop and mobile versions)", whatBn: "সাইটের প্রধান ছবি ও ভিডিও আপলোড বা বদলান (ডেস্কটপ ও মোবাইল আলাদা)", view: "/" },
  { href: "/sumon/promo-slides", icon: GalleryHorizontal, title: "Banners & slider", titleBn: "ব্যানার ও স্লাইডার", where: "Homepage, under the hero", whereBn: "হোমপেজে হিরোর নিচে", what: "Offer banners and the sliding cards", whatBn: "অফারের ব্যানার ও ঘুরতে থাকা কার্ড", view: "/" },
  { href: "/sumon/announcements", icon: Megaphone, title: "Announcement bar", titleBn: "ঘোষণা বার", where: "Very top of every page", whereBn: "সব পেজের একদম উপরে", what: "Scrolling offer or notice text", whatBn: "চলমান অফার বা জরুরি ঘোষণা", view: "/" },
  { href: "/sumon/settings", icon: Phone, title: "Name, logo text, phone, WhatsApp, address, footer", titleBn: "নাম, ফোন, WhatsApp, ঠিকানা, ফুটার", where: "Header, footer, contact page", whereBn: "হেডার, ফুটার, যোগাযোগ পেজ", what: "Site name, tagline, phone and WhatsApp numbers, address, business hours, social links", whatBn: "সাইটের নাম, ট্যাগলাইন, ফোন ও WhatsApp নম্বর, ঠিকানা, ব্যবসার সময়, সোশ্যাল লিংক", view: "/contact" },
  { href: "/sumon/products", icon: ImageIcon, title: "Product & service pictures", titleBn: "পণ্য ও সেবার ছবি", where: "Shop and service pages", whereBn: "দোকান ও সেবার পেজে", what: "Open a product or service and change its photos", whatBn: "পণ্য বা সেবা খুলে তার ছবি বদলান", view: "/products" },
  { href: "/sumon/blog", icon: BookOpen, title: "Blog", titleBn: "ব্লগ", where: "Blog page", whereBn: "ব্লগ পেজে", what: "Write, translate to English with one click, publish", whatBn: "লিখুন, এক ক্লিকে ইংরেজি করুন, প্রকাশ করুন", view: "/blog" },
  { href: "/sumon/showcase", icon: FolderKanban, title: "Project gallery", titleBn: "প্রজেক্ট গ্যালারি", where: "Projects page", whereBn: "প্রজেক্ট পেজে", what: "Samples of your work", whatBn: "আপনার করা কাজের নমুনা", view: "/projects" },
  { href: "/sumon/pages", icon: Briefcase, title: "Extra pages", titleBn: "অতিরিক্ত পেজ", where: "Its own web address", whereBn: "নিজস্ব ঠিকানায়", what: "Create your own pages (e.g. warranty, offers)", whatBn: "নিজের মতো পেজ বানান (যেমন ওয়ারেন্টি, অফার)" },
  { href: "/sumon/apon", icon: Smartphone, title: "Mobile app (Apon)", titleBn: "মোবাইল অ্যাপ (আপন)", where: "/apon page", whereBn: "/apon পেজে", what: "App versions, download page text, screenshots", whatBn: "অ্যাপের ভার্সন, ডাউনলোড পেজের লেখা, স্ক্রিনশট", view: "/apon" },
  { href: "/sumon/legal-pages", icon: ScrollText, title: "Privacy, terms, refund, cookies", titleBn: "গোপনীয়তা, শর্ত, রিফান্ড, কুকি", where: "Footer legal links", whereBn: "ফুটারের আইনি লিংকে", what: "Legal text in Bangla and English", whatBn: "বাংলা ও ইংরেজি আইনি লেখা", view: "/legal/privacy" },
];

export default function WebsiteHubPage() {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const sizes = BRAND_IMAGE_SLOTS.filter((s) => s.guide);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Make the website yours"
        titleBn="ওয়েবসাইট সাজান"
        description="Everything visitors see — banners, pictures, videos, text — in one place. Pick what you want to change."
        descriptionBn="ভিজিটর যা দেখে — ব্যানার, ছবি, ভিডিও, লেখা — সব এক জায়গায়। কী বদলাতে চান বাছুন।"
      />

      <div className="rounded-2xl border border-brand-100 bg-brand-50/60 dark:bg-white/5 dark:border-white/10 p-4 text-sm leading-relaxed flex gap-3">
        <Sparkles className="w-5 h-5 text-brand-600 flex-none mt-0.5" aria-hidden />
        <p>
          {bn
            ? "প্রতিটি কার্ডে লেখা আছে এটি সাইটের কোথায় দেখা যায় ও কী কী বদলানো যায়। সংরক্ষণ করলেই সাইটে বদলে যায় — আবার লাইভ দেখতে “সাইটে দেখুন” চাপুন।"
            : "Each card says where the result shows on the site and what you can change. Changes go live as soon as you save — press “View on site” to check."}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {SPOTS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.href} className="enterprise-card p-4 sm:p-5 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-white/10 dark:text-brand-300"><Icon className="w-5 h-5" aria-hidden /></span>
                <div className="min-w-0">
                  <h2 className="font-bold text-heading leading-snug">{bn ? s.titleBn : s.title}</h2>
                  <p className="text-xs text-muted mt-0.5">{bn ? "দেখা যায়: " : "Shows on: "}{bn ? s.whereBn : s.where}</p>
                </div>
              </div>
              <p className="text-sm text-muted leading-relaxed flex-1">{bn ? s.whatBn : s.what}</p>
              <div className="flex flex-wrap gap-2">
                <Link href={s.href} className="btn btn-brand btn-sm gap-1.5">{bn ? "বদলান" : "Edit"}<ArrowRight className="w-4 h-4" aria-hidden /></Link>
                {s.view && (
                  <a href={s.view} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm gap-1.5"><ExternalLink className="w-4 h-4" aria-hidden />{bn ? "সাইটে দেখুন" : "View on site"}</a>
                )}
              </div>
            </div>
          );
        })}
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
