"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, ImageIcon, X } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import PageHero from "@/components/ui/PageHero";
import { PROJECTS } from "@/lib/data/projects";
import { cn } from "@/lib/utils";

const GALLERY_IMAGES = [
  { src: "/logo.jpg", alt: "ABO Enterprise", category: "office" },
  ...PROJECTS.map((p) => ({ src: p.image, alt: p.title.en, category: "projects" })),
];

const FILTERS = [
  { id: "all", label: { en: "All", bn: "সব" } },
  { id: "projects", label: { en: "Projects", bn: "প্রজেক্ট" } },
  { id: "office", label: { en: "Office", bn: "অফিস" } },
];

export default function GalleryPage() {
  const { lang } = useLanguageStore();
  const [filter, setFilter] = useState("all");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const images = GALLERY_IMAGES.filter((img) => filter === "all" || img.category === filter);

  return (
    <main>
      <PageHero
        title={lang === "bn" ? "গ্যালারি" : "Gallery"}
        subtitle={lang === "bn" ? "আমাদের কাজ ও অফিসের ছবি" : "Our work, office and project showcase"}
        breadcrumbs={[{ label: lang === "bn" ? "গ্যালারি" : "Gallery" }]}
      />

      <section className="enterprise-section">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                  filter === f.id ? "bg-brand-600 text-white" : "enterprise-card text-muted hover:text-heading"
                )}
              >
                {lang === "bn" ? f.label.bn : f.label.en}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img, i) => (
              <button
                key={`${img.src}-${i}`}
                type="button"
                onClick={() => setLightbox(img.src)}
                className="enterprise-card-hover overflow-hidden aspect-square relative group"
              >
                <Image src={img.src} alt={img.alt} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width:768px) 50vw, 25vw" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>

          <div className="enterprise-card p-8 mt-12 text-center max-w-2xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mx-auto mb-4">
              <Play className="w-7 h-7 text-brand-600" />
            </div>
            <h3 className="font-bold text-heading mb-2">{lang === "bn" ? "ভিডিও গ্যালারি" : "Video Gallery"}</h3>
            <p className="text-sm text-muted">
              {lang === "bn" ? "ভিডিও রিভিউ ও প্রজেক্ট ডেমো শীঘ্রই আসছে।" : "Video reviews and project demos coming soon."}
            </p>
          </div>
        </div>
      </section>

      {lightbox && (
        <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button type="button" className="absolute top-4 right-4 text-white" aria-label="Close" onClick={() => setLightbox(null)}>
            <X className="w-8 h-8" />
          </button>
          <div className="relative w-full max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
            <Image src={lightbox} alt="" fill className="object-contain" sizes="100vw" />
          </div>
        </div>
      )}
    </main>
  );
}
