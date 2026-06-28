import type { Metadata } from "next";
import type { BlogPost } from "@/types";
import { SITE_URL } from "@/lib/tokens";
import { getApiBaseUrl } from "@/lib/apiBase";
import BlogGrid from "./BlogGrid";

const API_BASE = getApiBaseUrl();

export const metadata: Metadata = {
  title: "Blog | ABO Enterprise",
  description:
    "Tech tips, business insights, and updates from ABO Enterprise — Bangladesh's complete technology ecosystem.",
  alternates: { canonical: `${SITE_URL}/blog` },
};

async function fetchPosts(page = 1): Promise<{ posts: BlogPost[]; total: number; total_pages: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/blog?page=${page}&per_page=12`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(55000),
    });
    if (!res.ok) return { posts: [], total: 0, total_pages: 1 };
    const json = await res.json();
    return {
      posts: (json.data ?? []) as BlogPost[],
      total: json.meta?.total ?? 0,
      total_pages: json.meta?.total_pages ?? 1,
    };
  } catch {
    return { posts: [], total: 0, total_pages: 1 };
  }
}

export default async function BlogListPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const { posts, total, total_pages } = await fetchPosts(page);

  return (
    <main className="min-h-screen">
      <section className="gradient-brand text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Blog</h1>
          <p className="text-xl text-brand-100">
            Tech tips, business insights & updates from ABO Enterprise
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <BlogGrid posts={posts} page={page} totalPages={total_pages} />
      </div>
    </main>
  );
}
