"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Play, ImageIcon, X, ExternalLink } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import PageHero from "@/components/ui/PageHero";
import { cn } from "@/lib/utils";
import { useShowcaseContent } from "@/hooks/useShowcaseContent";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { toVideoEmbedUrl } from "@/lib/showcaseContent";

const FILTERS = [
  { id: "all", label: { en: "All", bn: "সব" } },
  { id: "projects", label: { en: "Projects", bn: "প্রজেক্ট" } },
  { id: "office", label: { en: "Office", bn: "অফিস" } },
];

export default function GalleryPage() {
  const { lang } = useLanguageStore();
  const { projects } = useShowcaseContent();
  const { settings } = usePublicSettings(["gallery_office_image_url"]);
  const officeImage = getSettingValue(settings, "gallery_office_image_url");
  const [filter, setFilter] = useState("all");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const images = useMemo(() => {
    const list = [
      ...(officeImage ? [{ src: officeImage, alt: "ABO Enterprise Office", category: "office" as const }] : []),
      ...projects.flatMap((p) => [
        { src: p.image, alt: p.title.en, category: "projects" as const },
        ...p.images.map((src) => ({ src, alt: p.title.en, category: "projects" as const })),
      ].filter((img) => img.src)),
    ];
    return list.filter((img) => filter === "all" || img.category === filter);
  }, [projects, filter, officeImage]);

  const videos = useMemo(
    () => projects.filter((p) => p.videoUrl?.trim()).map((p) => ({ ...p, embed: toVideoEmbedUrl(p.videoUrl!) })),
    [projects]
  );

  return (
    <main>
      <PageHero
        pageKey="gallery"
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

          <div className="mt-12">
            <h3 className="font-bold text-heading mb-6 text-center text-xl">
              {lang === "bn" ? "ভিডিও গ্যালারি" : "Video Gallery"}
            </h3>
            {videos.length === 0 ? (
              <div className="enterprise-card p-8 text-center max-w-2xl mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mx-auto mb-4">
                  <Play className="w-7 h-7 text-brand-600" />
                </div>
                <p className="text-sm text-muted">
                  {lang === "bn" ? "এডমিন থেকে প্রজেক্টে ভিডিও লিংক যোগ করুন।" : "Add video links to projects from Admin → Project Gallery."}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {videos.map((p) => (
                  <div key={p.slug} className="enterprise-card overflow-hidden">
                    {p.embed && (p.embed.includes("youtube.com") || p.embed.includes("vimeo.com")) ? (
                      <div className="relative aspect-video">
                        <iframe src={p.embed} title={lang === "bn" ? p.title.bn : p.title.en} className="absolute inset-0 w-full h-full" allowFullScreen />
                      </div>
                    ) : p.embed ? (
                      <video src={p.embed} controls className="w-full aspect-video object-cover bg-black" />
                    ) : null}
                    <div className="p-4">
                      <h4 className="font-bold text-heading">{lang === "bn" ? p.title.bn : p.title.en}</h4>
                      {p.liveUrl && (
                        <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-brand-600 mt-2 hover:underline">
                          <ExternalLink className="w-3.5 h-3.5" />
                          {lang === "bn" ? "লাইভ দেখুন" : "View Live"}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
