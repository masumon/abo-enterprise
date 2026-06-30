"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import LeadForm from "@/components/projects/LeadForm";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import PageHero from "@/components/ui/PageHero";
import GlassCard from "@/components/ui/GlassCard";
import { useShowcaseContent } from "@/hooks/useShowcaseContent";
import { ExternalLink, Play } from "lucide-react";

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

      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-heading mb-12 text-center">{t({ en: "How It Works", bn: "কিভাবে কাজ করে" })}</h2>
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {STEPS.map((s, i) => (
            <div key={i} className="text-center">
              <div className="w-12 h-12 bg-brand-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">{i + 1}</div>
              <h3 className="font-bold text-heading mb-2">{t(s.title)}</h3>
              <p className="text-sm text-muted">{t(s.desc)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-heading mb-6 text-center">
          {t({ en: "Project Gallery", bn: "প্রজেক্ট গ্যালারি" })}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <GlassCard key={p.slug} hover className="overflow-hidden h-full">
              <Link href={`/projects/${p.slug}`} className="block">
                <div className="relative h-40">
                  {p.image ? (
                    <Image src={p.image} alt={t(p.title)} fill className="object-cover" sizes="(max-width:640px) 100vw, 33vw" />
                  ) : (
                    <div className="h-full bg-gradient-to-br from-brand-100 to-brand-200" />
                  )}
                  {p.videoUrl && (
                    <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                      <Play className="w-3 h-3" /> Demo
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs text-brand-600 font-semibold">{t(p.category)}</p>
                  <h3 className="font-bold mt-1">{t(p.title)}</h3>
                  <p className="text-xs text-gray-500 mt-2">{p.technologies.join(" · ")}</p>
                </div>
              </Link>
              {p.liveUrl && (
                <div className="px-4 pb-4 -mt-1">
                  <a
                    href={p.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {lang === "bn" ? "লাইভ দেখুন" : "View Live"}
                  </a>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      </section>

      {!showForm && (
        <section className="section-panel border-y py-16 text-center px-4">
          <h2 className="text-3xl font-bold text-heading mb-4">{t({ en: "Ready to start?", bn: "শুরু করতে প্রস্তুত?" })}</h2>
          <button type="button" onClick={() => setShowForm(true)} className="btn btn-brand btn-lg">{t({ en: "Get Started", bn: "শুরু করুন" })}</button>
        </section>
      )}

      <section className="max-w-2xl mx-auto px-4 py-16">
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
