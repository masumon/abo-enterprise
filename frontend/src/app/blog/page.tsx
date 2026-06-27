import type { Metadata } from "next";
import Link from "next/link";
import type { BlogPost } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const metadata: Metadata = {
  title: "Blog | ABO Enterprise",
  description:
    "Tech tips, business insights, and updates from ABO Enterprise — Bangladesh's complete technology ecosystem.",
  alternates: { canonical: "https://aboenterprise.vercel.app/blog" },
};

async function fetchPosts(page = 1): Promise<{ posts: BlogPost[]; total: number; total_pages: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/blog?page=${page}&per_page=12`, {
      next: { revalidate: 60 },
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

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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
        {posts.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg font-semibold mb-2">No posts yet</p>
            <p className="text-sm">Check back soon for articles and updates.</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:border-brand-200 transition-all"
                >
                  {post.featured_image_url ? (
                    <div className="aspect-video overflow-hidden bg-gray-100">
                      <img
                        src={post.featured_image_url}
                        alt={post.title_en}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center">
                      <span className="text-4xl text-brand-200 font-bold select-none">
                        {post.title_en.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col flex-1 p-5">
                    {post.category && (
                      <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">
                        {post.category}
                      </span>
                    )}
                    <h2 className="font-bold text-gray-900 text-base leading-snug mb-2 group-hover:text-brand-600 transition-colors line-clamp-2">
                      {post.title_en}
                    </h2>
                    {post.excerpt_en && (
                      <p className="text-sm text-gray-500 line-clamp-3 flex-1">{post.excerpt_en}</p>
                    )}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50 text-xs text-gray-400">
                      <span>{post.author_name}</span>
                      <span>{formatDate(post.published_at ?? post.created_at)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {total_pages > 1 && (
              <nav className="flex justify-center gap-2" aria-label="Pagination">
                {page > 1 && (
                  <Link
                    href={`/blog?page=${page - 1}`}
                    className="btn btn-outline btn-sm"
                  >
                    Previous
                  </Link>
                )}
                <span className="flex items-center px-3 text-sm text-gray-500">
                  Page {page} of {total_pages}
                </span>
                {page < total_pages && (
                  <Link
                    href={`/blog?page=${page + 1}`}
                    className="btn btn-outline btn-sm"
                  >
                    Next
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}
