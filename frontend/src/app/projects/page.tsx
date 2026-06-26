"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import LeadForm from "@/components/projects/LeadForm";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { PROJECTS } from "@/lib/data/projects";
import GlassCard from "@/components/ui/GlassCard";

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
  const [showForm, setShowForm] = useState(false);
  const t = (o: { en: string; bn: string }) => (lang === "bn" ? o.bn : o.en);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <section className="gradient-brand text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t({ en: "Custom Projects", bn: "কাস্টম প্রজেক্ট" })}</h1>
          <p className="text-xl text-brand-100 max-w-2xl mx-auto">
            {t({ en: "Need a bespoke solution? Tell us your vision.", bn: "কাস্টম সমাধান দরকার? আপনার ভিশন জানান।" })}
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">{t({ en: "How It Works", bn: "কিভাবে কাজ করে" })}</h2>
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {STEPS.map((s, i) => (
            <div key={i} className="text-center">
              <div className="w-12 h-12 bg-brand-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">{i + 1}</div>
              <h3 className="font-bold text-gray-900 mb-2">{t(s.title)}</h3>
              <p className="text-sm text-gray-600">{t(s.desc)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          {t({ en: "Project Gallery", bn: "প্রজেক্ট গ্যালারি" })}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PROJECTS.map((p) => (
            <Link key={p.slug} href={`/projects/${p.slug}`}>
              <GlassCard hover className="overflow-hidden h-full">
                <div className="relative h-40">
                  <Image src={p.image} alt={t(p.title)} fill className="object-cover" sizes="(max-width:640px) 100vw, 33vw" />
                </div>
                <div className="p-4">
                  <p className="text-xs text-brand-600 font-semibold">{t(p.category)}</p>
                  <h3 className="font-bold mt-1">{t(p.title)}</h3>
                  <p className="text-xs text-gray-500 mt-2">{p.technologies.join(" · ")}</p>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </section>

      {!showForm && (
        <section className="bg-white border-y py-16 text-center px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{t({ en: "Ready to start?", bn: "শুরু করতে প্রস্তুত?" })}</h2>
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
                <li key={p} className="flex items-center gap-2 text-gray-700 text-sm"><CheckCircle className="w-4 h-4 text-green-600" />{p}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
