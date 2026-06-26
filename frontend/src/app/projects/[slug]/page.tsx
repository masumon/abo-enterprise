"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { getProject } from "@/lib/data/projects";
import { useLanguageStore } from "@/store/language";
import GlassCard from "@/components/ui/GlassCard";
import LeadForm from "@/components/projects/LeadForm";

export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang } = useLanguageStore();
  const project = getProject(slug);
  const t = (o: { en: string; bn: string }) => (lang === "bn" ? o.bn : o.en);

  if (!project) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-gray-500 mb-4">{lang === "bn" ? "প্রজেক্ট পাওয়া যায়নি" : "Project not found"}</p>
        <Link href="/projects" className="btn btn-brand btn-md">{lang === "bn" ? "সব প্রজেক্ট" : "All Projects"}</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <section className="relative h-64 md:h-80">
        <Image src={project.image} alt={t(project.title)} fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <Link href="/projects" className="flex items-center gap-1 text-sm text-white/80 hover:text-white mb-3">
            <ChevronLeft className="w-4 h-4" /> {lang === "bn" ? "প্রজেক্ট" : "Projects"}
          </Link>
          <h1 className="text-3xl font-bold">{t(project.title)}</h1>
          <p className="text-white/80">{t(project.client)} · {project.year}</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="flex flex-wrap gap-2 mb-6">
          {project.technologies.map((tech) => (
            <span key={tech} className="badge bg-brand-50 text-brand-700">{tech}</span>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[
            { label: { en: "Problem", bn: "সমস্যা" }, text: project.problem },
            { label: { en: "Solution", bn: "সমাধান" }, text: project.solution },
            { label: { en: "Result", bn: "ফলাফল" }, text: project.result },
          ].map((block) => (
            <GlassCard key={block.label.en} className="p-5">
              <h3 className="font-bold text-brand-600 mb-2">{t(block.label)}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{t(block.text)}</p>
            </GlassCard>
          ))}
        </div>

        {project.screenshots.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4">{lang === "bn" ? "স্ক্রিনশট" : "Screenshots"}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {project.screenshots.map((src, i) => (
                <div key={i} className="relative h-48 rounded-xl overflow-hidden">
                  <Image src={src} alt={`Screenshot ${i + 1}`} fill className="object-cover" sizes="(max-width:640px) 100vw, 50vw" />
                </div>
              ))}
            </div>
          </div>
        )}

        <GlassCard className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            {lang === "bn" ? "এই ধরনের প্রজেক্ট চান?" : "Want a similar project?"}
            <ArrowRight className="w-5 h-5 text-brand-600" />
          </h2>
          <LeadForm />
        </GlassCard>
      </div>
    </main>
  );
}
