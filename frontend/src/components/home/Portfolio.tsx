"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useShowcaseContent } from "@/hooks/useShowcaseContent";
import GlassCard from "@/components/ui/GlassCard";
import { resolveProjectImage } from "@/lib/demoImages";

export default function Portfolio() {
  const { lang } = useLanguageStore();
  const { projects } = useShowcaseContent();
  const t = (o: { en: string; bn: string }) => (lang === "bn" ? o.bn : o.en);

  return (
    <section className="py-16 section-panel">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <span className="inline-block text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-100 px-3 py-1 rounded-full mb-3">
            {lang === "bn" ? "✅ বাস্তব প্রজেক্ট" : "✅ Real Projects"}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-heading mb-3">
            {lang === "bn" ? "আমাদের কাজের নমুনা" : "Our Work"}
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {projects.map((p) => (
            <Link key={p.slug} href={`/projects/${p.slug}`}>
              <GlassCard hover className="overflow-hidden h-full group">
                <div className="relative h-44 flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/30 dark:to-brand-800/20 p-4 overflow-hidden">
                  <Image
                    src={resolveProjectImage(p.image)}
                    alt={t(p.title)}
                    fill
                    className="object-contain object-center p-3 transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width:768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-5">
                  <span className="text-xs text-brand-600 font-semibold">{t(p.category)}</span>
                  <h3 className="font-bold text-heading mt-1">{t(p.title)}</h3>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{t(p.result)}</p>
                  <span className="inline-flex items-center gap-1 text-sm text-brand-600 font-medium mt-3">
                    {lang === "bn" ? "কেস স্টাডি" : "Case Study"} <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
