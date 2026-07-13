"use client";

import Link from "next/link";
import { Target, Eye, Heart, CheckCircle, Users, Briefcase, ShoppingCart, Award, Calendar, TrendingUp } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import PageHero from "@/components/ui/PageHero";
import BrandLogo from "@/components/ui/BrandLogo";
import Image from "next/image";
import { getBrandFullTitle } from "@/lib/tokens";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import {
  ABOUT_TEAM_KEY,
  ABOUT_STORY_IMAGE_KEY,
  getAboutStoryImage,
  getAboutTeam,
  type CmsTeamMember,
} from "@/lib/cmsContent";

const VALUES = [
  { icon: Heart, title: { en: "Customer First", bn: "গ্রাহক প্রথম" }, desc: { en: "Every decision starts with what's best for our customers.", bn: "সব সিদ্ধান্ত গ্রাহকের স্বার্থে।" } },
  { icon: Target, title: { en: "Excellence", bn: "উৎকর্ষ" }, desc: { en: "Quality that exceeds expectations.", bn: "প্রত্যাশা ছাড়িয়ে মান।" } },
  { icon: CheckCircle, title: { en: "Integrity", bn: "সততা" }, desc: { en: "Honest pricing and transparent communication.", bn: "সৎ মূল্য ও স্বচ্ছ যোগাযোগ।" } },
  { icon: TrendingUp, title: { en: "Innovation", bn: "উদ্ভাবন" }, desc: { en: "Latest technology including AI.", bn: "AI সহ আধুনিক প্রযুক্তি।" } },
];

const TIMELINE = [
  { year: "2017", title: { en: "Founded in Sylhet", bn: "সিলেটে প্রতিষ্ঠা" }, desc: { en: "Started as a mobile accessories & digital service center at Hazi Bahar Uddin Market.", bn: "হাজি বাহার উদ্দিন মার্কেটে মোবাইল এক্সেসরিজ ও ডিজিটাল সার্ভিস সেন্টার হিসেবে শুরু।" } },
  { year: "2020", title: { en: "Digital & Software Lab", bn: "ডিজিটাল ও সফটওয়্যার ল্যাব" }, desc: { en: "Added digital services, printing, and mobile & computer software repair.", bn: "ডিজিটাল সেবা, প্রিন্টিং এবং মোবাইল ও কম্পিউটার সফটওয়্যার রিপেয়ার যোগ।" } },
  { year: "2023", title: { en: "Business Software Division", bn: "বিজনেস সফটওয়্যার বিভাগ" }, desc: { en: "Launched POS, ERP, IPTV, ISP billing and custom software.", bn: "POS, ERP, IPTV, ISP বিলিং ও কাস্টম সফটওয়্যার চালু।" } },
  { year: "2025", title: { en: "AI & Automation", bn: "AI ও অটোমেশন" }, desc: { en: "AI assistant, automation and custom development with nationwide reach.", bn: "AI সহকারী, অটোমেশন ও কাস্টম ডেভেলপমেন্ট — সারাদেশে পৌঁছানো।" } },
];

const ACHIEVEMENTS = [
  { icon: Users, value: "10,000+", label: { en: "Happy Customers", bn: "সন্তুষ্ট গ্রাহক" } },
  { icon: Briefcase, value: "50+", label: { en: "Projects Delivered", bn: "সম্পন্ন প্রজেক্ট" } },
  { icon: ShoppingCart, value: "200+", label: { en: "Products", bn: "পণ্য" } },
  { icon: Award, value: "8+", label: { en: "Years Experience", bn: "বছরের অভিজ্ঞতা" } },
];

const TEAM_FALLBACK: CmsTeamMember[] = [
  { id: "founding-team", name: "Ahmed Brothers", role: { en: "Founding Team", bn: "প্রতিষ্ঠাতা দল" }, desc: { en: "Leading products, services & software strategy.", bn: "পণ্য, সেবা ও সফটওয়্যার কৌশল পরিচালনা।" } },
  { id: "tech-team", name: "Tech Team", role: { en: "Software Engineers", bn: "সফটওয়্যার ইঞ্জিনিয়ার" }, desc: { en: "Web, mobile, AI & automation specialists.", bn: "ওয়েব, মোবাইল, AI ও অটোমেশন বিশেষজ্ঞ।" } },
  { id: "support-team", name: "Support Team", role: { en: "Customer Success", bn: "গ্রাহক সেবা" }, desc: { en: "24/7 support via WhatsApp, phone & AI assistant.", bn: "WhatsApp, ফোন ও AI সহকারীতে ২৪/৭ সেবা।" } },
];

export default function AboutPage() {
  const { lang } = useLanguageStore();
  const { settings } = usePublicSettings([ABOUT_TEAM_KEY, ABOUT_STORY_IMAGE_KEY]);
  const team = getAboutTeam(settings, TEAM_FALLBACK);
  const storyImage = getAboutStoryImage(settings);
  const t = (o: { en: string; bn: string }) => (lang === "bn" ? o.bn : o.en);

  return (
    <main className="min-h-screen">
      <PageHero
        pageKey="about"
        title="ABO Enterprise"
        subtitle={getBrandFullTitle(lang)}
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "আমাদের সম্পর্কে" : "About" },
        ]}
      >
        <div className="flex flex-col items-center text-center mt-2">
          <BrandLogo size="xl" href={false} variant="light" className="mb-3" />
          <p className="text-sm text-white font-semibold mt-2">{getBrandFullTitle(lang)}</p>
          <p className="text-sm text-white/70 mt-2">Sumon Brothers Organization</p>
        </div>
      </PageHero>

      <section className="py-16 px-4 section-panel">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          <div>
            <div className="section-title"><h2>{t({ en: "Our Story", bn: "আমাদের গল্প" })}</h2></div>
            <p className="text-muted leading-relaxed mt-4">
              {t({
                en: "ABO Enterprise started in Sylhet as a mobile accessories & digital service center. Over 8+ years we have grown with our customers — adding a software lab for mobile and computer repair, digital services, and professional documentation.",
                bn: "ABO Enterprise সিলেটে একটি মোবাইল এক্সেসরিজ ও ডিজিটাল সার্ভিস সেন্টার হিসেবে শুরু হয়। ৮+ বছরে আমরা গ্রাহকদের সাথে বেড়ে উঠেছি — মোবাইল ও কম্পিউটার রিপেয়ারের সফটওয়্যার ল্যাব, ডিজিটাল সেবা ও পেশাদার ডকুমেন্টেশন যুক্ত করেছি।",
              })}
            </p>
            <p className="text-muted leading-relaxed mt-4">
              {t({
                en: "Today we have expanded into business software — POS, ERP, IPTV and ISP billing — along with AI, automation, and custom development. From a single shop to a complete technology partner, we deliver affordable, reliable solutions that grow with you.",
                bn: "আজ আমরা বিজনেস সফটওয়্যার — POS, ERP, IPTV ও ISP বিলিং — এবং AI, অটোমেশন ও কাস্টম ডেভেলপমেন্টে সম্প্রসারিত হয়েছি। একটি দোকান থেকে সম্পূর্ণ টেকনোলজি পার্টনার — আমরা সাশ্রয়ী, নির্ভরযোগ্য সমাধান দিই যা আপনার সাথে বাড়ে।",
              })}
            </p>
          </div>
          <div className="space-y-4">
            {storyImage && (
              <div className="relative aspect-video rounded-2xl overflow-hidden shadow-md">
                <Image
                  src={storyImage}
                  alt={t({ en: "ABO Enterprise office", bn: "ABO Enterprise অফিস" })}
                  fill
                  className="object-cover"
                  sizes="(max-width:768px) 100vw, 50vw"
                />
              </div>
            )}
            <div className="card p-6 bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/30 dark:to-[var(--surface-card)]">
              <Eye className="w-8 h-8 text-brand-600 mb-3" />
              <h3 className="font-bold text-lg mb-2">{t({ en: "Our Vision", bn: "আমাদের ভিশন" })}</h3>
              <p className="text-muted text-sm leading-relaxed">{t({ en: "To become Bangladesh's most trusted integrated technology provider — empowering every business with affordable, world-class digital tools.", bn: "বাংলাদেশের সবচেয়ে বিশ্বস্ত ইন্টিগ্রেটেড টেক প্রদানকারী হওয়া — সাশ্রয়ী, বিশ্বমানের ডিজিটাল সরঞ্জামে প্রতিটি ব্যবসাকে ক্ষমতায়ন করা।" })}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 px-4 section-panel-alt">
        <div className="max-w-5xl mx-auto">
          <div className="section-title text-center"><h2>{t({ en: "Key Achievements", bn: "প্রধান অর্জন" })}</h2></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {ACHIEVEMENTS.map(({ icon: Icon, value, label }) => (
              <div key={label.en} className="card p-5 text-center">
                <Icon className="w-7 h-7 text-brand-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-brand-700">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{t(label)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 section-panel">
        <div className="max-w-3xl mx-auto">
          <div className="section-title text-center"><h2>{t({ en: "Our Journey", bn: "আমাদের যাত্রা" })}</h2></div>
          <div className="mt-10 space-y-6">
            {TIMELINE.map((item) => (
              <div key={item.year} className="flex gap-4">
                <div className="flex-shrink-0 w-16 text-center">
                  <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-600 text-white font-bold text-sm">
                    {item.year}
                  </span>
                </div>
                <div className="card p-5 flex-1">
                  <h3 className="font-bold text-gray-900">{t(item.title)}</h3>
                  <p className="text-sm text-gray-500 mt-1">{t(item.desc)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 section-panel-alt">
        <div className="max-w-4xl mx-auto">
          <div className="section-title text-center"><h2>{t({ en: "Our Values", bn: "আমাদের মূল্যবোধ" })}</h2></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div key={title.en} className="card p-6 text-center">
                <Icon className="w-8 h-8 text-brand-600 mx-auto mb-3" />
                <h3 className="font-bold mb-2">{t(title)}</h3>
                <p className="text-sm text-gray-500">{t(desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 section-panel">
        <div className="max-w-4xl mx-auto">
          <div className="section-title text-center"><h2>{t({ en: "Our Team", bn: "আমাদের দল" })}</h2></div>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {team.map((member) => (
              <div key={member.id ?? member.name} className="card p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden relative">
                  {member.image ? (
                    <Image src={member.image} alt={member.name} fill className="object-cover" sizes="64px" />
                  ) : (
                    <Users className="w-6 h-6 text-brand-600" />
                  )}
                </div>
                <h3 className="font-bold text-gray-900">{member.name}</h3>
                <p className="text-sm text-brand-600 font-medium mt-1">{t(member.role)}</p>
                <p className="text-xs text-gray-500 mt-2">{t(member.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-brand opacity-95" />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)" }} />
        <div className="relative max-w-3xl mx-auto text-center text-white">
          <Calendar className="w-10 h-10 mx-auto mb-4 text-yellow-300" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t({ en: "Ready to Work Together?", bn: "একসাথে কাজ করতে প্রস্তুত?" })}</h2>
          <p className="text-brand-100 mb-8 max-w-lg mx-auto">
            {t({ en: "Whether you need products, printing, legal help, or custom software — we're here for you.", bn: "পণ্য, প্রিন্টিং, আইনি সহায়তা বা কাস্টম সফটওয়্যার — আমরা আপনার পাশে আছি।" })}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact" className="btn btn-lg bg-white text-brand-700 hover:bg-brand-50 font-semibold">{t({ en: "Contact Us", bn: "যোগাযোগ করুন" })}</Link>
            <Link href="/projects" className="btn btn-lg btn-outline border-white/50 text-white hover:bg-white/10">{t({ en: "Get a Quote", bn: "কোটেশন নিন" })}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
