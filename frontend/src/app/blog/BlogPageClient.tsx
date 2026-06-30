"use client";

import type { BlogPost } from "@/types";
import PageHero from "@/components/ui/PageHero";
import { useLanguageStore } from "@/store/language";
import BlogGrid from "./BlogGrid";

interface Props {
  posts: BlogPost[];
  page: number;
  totalPages: number;
}

export default function BlogPageClient({ posts, page, totalPages }: Props) {
  const { lang } = useLanguageStore();

  return (
    <main className="min-h-screen">
      <PageHero
        pageKey="blog"
        title="Blog"
        subtitle={
          lang === "bn"
            ? "টেক টিপস, ব্যবসায়িক অন্তর্দৃষ্টি ও আপডেট"
            : "Tech tips, business insights & updates from ABO Enterprise"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: "Blog" },
        ]}
      />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <BlogGrid posts={posts} page={page} totalPages={totalPages} />
      </div>
    </main>
  );
}
