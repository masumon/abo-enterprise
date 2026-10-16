"use client";

import { stripMarks } from "@/lib/productText";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import LeadForm from "@/components/projects/LeadForm";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import PageHero from "@/components/ui/PageHero";
import GlassCard from "@/components/ui/GlassCard";
import Reveal from "@/components/ui/Reveal";
import { useShowcaseContent } from "@/hooks/useShowcaseContent";
import { ExternalLink, Play, Code2 } from "lucide-react";

const STEPS = [
  { title: { en: "Submit Requirements", bn: "প্রয়োজনীয়তা জমা দিন" }, desc: { en: "Tell us about your project, timeline, and budget", bn: "প্রজেক্ট, সময়সীমা ও বাজেট জানান" } },
  { title: { en: "Get a Custom Quote", bn: "কাস্টম কোটেশন পান" }, desc: { en: "We analyze your needs and provide a detailed proposal", bn: "আমরা বিশ্লেষণ করে বিস্তারিত প্রস্তাব দিই" } },
  { title: { en: "Consultation Call", bn: "পরামর্শ কল" }, desc: { en: "Discuss your project with our expert team", bn: "বিশেষজ্ঞ দলের সাথে আলোচনা করুন" } },
  { title: { en: "Project Kickoff", bn: "প্রজেক্ট শুরু" }, desc: { en: "Start building with a dedicated team", bn: "নিবেদিত দলের সাথে কাজ শুরু করুন" } },
];

const WHY = {
  en: ["Experienced team", "Transparent pricing", "Regular updates", "Post-project support", "Quality delivery", "Flexible engagement"],
  bn: ["অভিজ্ঞ দল", "স্বচ্ছ মূল্য", "নিয়মিত আপডেট", "প্রজেক্ট পরবর্তী সাপোর্ট", "মানসম্মত ডেলিভারি", "নমনীয় চুক্তি"],
};

export default function ProjectsPage() {
  const { lang } = useLanguageStore();
  const { projects } = useShowcaseContent();
  const [showForm, setShowForm] = useState(false);
  const t = (o: { en: string; bn: string }) => (lang === "bn" ? o.bn : o.en);
  const [cat, setCat] = useState("");
  const sorted = [...projects].sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const categories = Array.from(new Set(sorted.map((p) => t(p.category)).filter(Boolean)));
  const shown = cat ? sorted.filter((p) => t(p.category) === cat) : sorted;
  const startProject = () => {
    setShowForm(true);
    setTimeout(() => document.getElementById("project-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  return (
    <div className="min-h-screen page-gradient">
      <PageHero
        pageKey="projects"
        align="center"
        title={t({ en: "Custom Projects", bn: "কাস্টম প্রজেক্ট" })}
        subtitle={t({ en: "Need a bespoke solution? Tell us your vision.", bn: "কাস্টম সমাধান দরকার? আপনার ভিশন জানান।" })}
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "প্রজেক্ট" : "Projects" },
        ]}
        badge={lang === "bn" ? "এন্টারপ্রাইজ সমাধান" : "Enterprise Solutions"}
      />

      <section className="max-w-6xl mx-auto px-4 pt-10 pb-6 sm:pb-12" aria-labelledby="gallery-title">
        <div className="text-center mb-6">
          <h2 id="gallery-title" className="text-2xl sm:text-3xl font-bold text-heading">{t({ en: "Our Work", bn: "আমাদের করা কাজ" })}</h2>
          <p className="text-sm text-muted mt-1">{t({ en: "Real projects we have built — tap one to see the details.", bn: "আমাদের তৈরি আসল প্রজেক্ট — বিস্তারিত দেখতে কার্ডে চাপুন।" })}</p>
        </div>
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 sm:justify-center" role="tablist" aria-label={t({ en: "Filter by type", bn: "ধরন অনুযায়ী দেখুন" })}>
            {["", ...categories].map((c) => (
              <button key={c || "all"} type="button" role="tab" aria-selected={cat === c} onClick={() => setCat(c)}
                className={`shrink-0 rounded-full border px-4 min-h-10 text-sm whitespace-nowrap transition-colors ${cat === c ? "bg-brand-600 text-white border-brand-600 font-semibold" : "border-gray-200 dark:border-white/10 hover:border-brand-400"}`}>
                {c || t({ en: "All", bn: "সব" })}
              </button>
            ))}
          </div>
        )}
        {shown.length === 0 ? (
          <p className="text-center text-muted py-10">{t({ en: "Projects will appear here soon.", bn: "শিগগিরই এখানে প্রজেক্ট দেখাবে।" })}</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {shown.map((p, i) => {
              const blurb = stripMarks(t(p.result) || t(p.solution) || t(p.problem));
              return (
                <Reveal key={p.slug} as="div" delay={(i % 6) * 60} className="h-full">
                  <GlassCard hover className="overflow-hidden h-full flex flex-col">
                    <Link href={`/projects/${p.slug}`} className="block">
                      <div className="relative aspect-video">
                        {p.image ? (
                          <Image src={p.image} alt={t(p.title)} fill className="object-cover" sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 flex items-center justify-center overflow-hidden">
                            <span aria-hidden className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-accent-500/15 blur-2xl" />
                            <span aria-hidden className="absolute -bottom-5 -left-3 text-white/[0.06] font-black text-[6.5rem] leading-none select-none">{t(p.title).charAt(0)}</span>
                            <span className="relative w-14 h-14 rounded-2xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center">
                              <Code2 className="w-7 h-7 text-accent-400" aria-hidden />
                            </span>
                          </div>
                        )}
                        {p.featured && <span className="absolute top-2 left-2 bg-accent-500 text-white text-[11px] font-bold px-2 py-1 rounded-full">⭐ {t({ en: "Featured", bn: "বিশেষ" })}</span>}
                        {p.videoUrl && (
                          <span className="absolute top-2 right-2 bg-black/60 text-white text-[11px] px-2 py-1 rounded-full flex items-center gap-1"><Play className="w-3 h-3" /> {t({ en: "Demo", bn: "ডেমো" })}</span>
                        )}
                      </div>
                      <div className="p-4 pb-2">
                        <p className="text-xs text-brand-600 font-semibold">{t(p.category)}{p.year ? ` · ${p.year}` : ""}</p>
                        <h3 className="font-bold text-heading mt-1 text-lg leading-snug">{t(p.title)}</h3>
                        {blurb && <p className="text-sm text-muted mt-1.5 line-clamp-2">{blurb}</p>}
                        {p.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {p.technologies.slice(0, 4).map((x) => <span key={x} className="rounded-full bg-gray-100 dark:bg-white/10 px-2 py-0.5 text-[11px]">{x}</span>)}
                            {p.technologies.length > 4 && <span className="text-[11px] text-muted">+{p.technologies.length - 4}</span>}
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="mt-auto px-4 pb-4 pt-2 flex flex-wrap items-center gap-2">
                      {(p.priceOnRequest || (p.price ?? 0) > 0) && (
                        <span className="text-sm font-semibold text-heading mr-auto">
                          {p.priceOnRequest ? t({ en: "Price on request", bn: "দাম আলোচনা সাপেক্ষে" }) : `৳${(p.price ?? 0).toLocaleString(lang === "bn" ? "bn-BD" : "en-US")} ${t({ en: "onwards", bn: "থেকে" })}`}
                        </span>
                      )}
                      <Link href={`/projects/${p.slug}`} className="btn btn-outline btn-sm min-h-10 gap-1">{t({ en: "Details", bn: "বিস্তারিত" })} <ArrowRight className="w-3.5 h-3.5" /></Link>
                      {p.liveUrl && (
                        <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="btn btn-brand btn-sm min-h-10 gap-1">
                          <ExternalLink className="w-3.5 h-3.5" /> {t({ en: "View live", bn: "লাইভ দেখুন" })}
                        </a>
                      )}
                    </div>
                  </GlassCard>
                </Reveal>
              );
            })}
          </div>
        )}
        <div className="text-center mt-8">
          <button type="button" onClick={startProject} className="btn btn-brand btn-lg gap-2">{t({ en: "I want a project like this", bn: "এরকম প্রজেক্ট করাতে চাই" })} <ArrowRight className="w-4 h-4" /></button>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
        <h2 className="text-3xl font-bold text-heading mb-6 sm:mb-12 text-center">{t({ en: "How It Works", bn: "কিভাবে কাজ করে" })}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-12">
          {STEPS.map((s, i) => (
            <div key={i} className="text-center">
              <div className="w-12 h-12 bg-brand-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">{i + 1}</div>
              <h3 className="font-bold text-heading mb-2">{t(s.title)}</h3>
              <p className="text-sm text-muted">{t(s.desc)}</p>
            </div>
          ))}
        </div>
      </section>

      {!showForm && (
        <section className="section-panel border-y py-8 sm:py-16 text-center px-4">
          <h2 className="text-3xl font-bold text-heading mb-4">{t({ en: "Ready to start?", bn: "শুরু করতে প্রস্তুত?" })}</h2>
          <button type="button" onClick={startProject} className="btn btn-brand btn-lg">{t({ en: "Get Started", bn: "শুরু করুন" })}</button>
        </section>
      )}

      <section id="project-form" className="max-w-2xl mx-auto px-4 py-8 sm:py-16 scroll-mt-24">
        {showForm ? (
          <div className="card p-8">
            <button type="button" onClick={() => setShowForm(false)} className="text-brand-600 font-semibold mb-6">← {t({ en: "Back", bn: "ফিরে যান" })}</button>
            <LeadForm onSuccess={() => setTimeout(() => setShowForm(false), 2000)} />
          </div>
        ) : (
          <div className="card p-8">
            <h3 className="text-xl font-bold mb-4">{t({ en: "Why ABO?", bn: "কেন ABO?" })}</h3>
            <ul className="space-y-2">
              {(lang === "bn" ? WHY.bn : WHY.en).map((p) => (
                <li key={p} className="flex items-center gap-2 text-muted text-sm"><CheckCircle className="w-4 h-4 text-green-600" />{p}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
