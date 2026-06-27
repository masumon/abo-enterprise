"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, BookOpen, Plus, Pencil, Trash2, X, Star, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { adminBlogApi } from "@/lib/api";
import type { BlogPost } from "@/types";
import StatusBadge from "@/components/admin/StatusBadge";
import { useToastStore } from "@/store/toast";

const CATEGORIES = ["technology", "business", "tips", "news", "case-study", "announcement"];

const EMPTY_FORM: Partial<BlogPost> = {
  slug: "",
  title_en: "",
  title_bn: "",
  excerpt_en: "",
  excerpt_bn: "",
  content_en: "",
  content_bn: "",
  featured_image_url: "",
  category: "",
  status: "draft",
  is_featured: false,
  author_name: "ABO Enterprise",
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<Partial<BlogPost> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [seoOpen, setSeoOpen] = useState(false);
  const toast = useToastStore((s) => s.push);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminBlogApi.list({ status: statusFilter || undefined, page, per_page: 20 });
      setPosts((r.data.data ?? []) as unknown as BlogPost[]);
      setTotal(r.data.meta?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing({ ...EMPTY_FORM });
    setIsNew(true);
    setSeoOpen(false);
  };

  const openEdit = (post: BlogPost) => {
    setEditing({ ...post });
    setIsNew(false);
    setSeoOpen(false);
  };

  const closeEditor = () => {
    setEditing(null);
    setIsNew(false);
  };

  const handleTitleChange = (v: string) => {
    setEditing(prev => {
      if (!prev) return prev;
      const updates: Partial<BlogPost> = { title_en: v };
      if (isNew || !prev.slug) updates.slug = slugify(v);
      return { ...prev, ...updates };
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.title_en?.trim()) { toast("error", "Title (EN) is required"); return; }
    if (!editing.slug?.trim()) { toast("error", "Slug is required"); return; }
    if (!editing.content_en?.trim()) { toast("error", "Content (EN) is required"); return; }

    setSaving(true);
    try {
      if (isNew) {
        await adminBlogApi.create(editing);
        toast("success", "Post created");
      } else {
        await adminBlogApi.update(editing.id!, editing);
        toast("success", "Post updated");
      }
      closeEditor();
      await load();
    } catch {
      toast("error", isNew ? "Failed to create post" : "Failed to update post");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await adminBlogApi.delete(id);
      toast("success", "Post deleted");
      await load();
    } catch {
      toast("error", "Failed to delete post");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total posts</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input w-auto text-sm"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <button onClick={openNew} className="btn btn-primary btn-sm gap-1.5">
            <Plus className="w-4 h-4" />
            New Post
          </button>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No posts found</p>
            <button onClick={openNew} className="btn btn-primary btn-sm mt-4 gap-1.5">
              <Plus className="w-4 h-4" /> Create first post
            </button>
          </div>
        ) : (
          <table className="table-premium">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Author</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {p.is_featured && <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                      <div>
                        <p className="font-medium text-gray-900 truncate max-w-[280px]">{p.title_en}</p>
                        <p className="text-xs text-gray-400">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600 capitalize">{p.category ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-600">{p.author_name}</td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                    {p.published_at
                      ? new Date(p.published_at).toLocaleDateString("en-BD")
                      : p.created_at
                        ? new Date(p.created_at).toLocaleDateString("en-BD")
                        : "—"}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id!)}
                        disabled={deletingId === p.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        {deletingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-outline btn-sm">Previous</button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {page}</span>
          <button disabled={posts.length < 20} onClick={() => setPage(p => p + 1)} className="btn btn-outline btn-sm">Next</button>
        </div>
      )}

      {/* Create / Edit Panel */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="ml-auto w-full max-w-2xl h-full flex flex-col bg-white shadow-2xl overflow-hidden animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">
                {isNew ? "New Post" : "Edit Post"}
              </h2>
              <button onClick={closeEditor} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Status + Featured row */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
                  <select
                    value={editing.status ?? "draft"}
                    onChange={e => setEditing(prev => prev ? { ...prev, status: e.target.value as "draft" | "published" } : prev)}
                    className="input w-full text-sm"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <button
                    type="button"
                    onClick={() => setEditing(prev => prev ? { ...prev, is_featured: !prev.is_featured } : prev)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      editing.is_featured
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <Star className="w-3.5 h-3.5" />
                    Featured
                  </button>
                </div>
              </div>

              {/* Title EN */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Title (English) <span className="text-red-400">*</span>
                </label>
                <input
                  value={editing.title_en ?? ""}
                  onChange={e => handleTitleChange(e.target.value)}
                  placeholder="Post title in English"
                  className="input w-full"
                />
              </div>

              {/* Title BN */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Title (বাংলা)</label>
                <input
                  value={editing.title_bn ?? ""}
                  onChange={e => setEditing(prev => prev ? { ...prev, title_bn: e.target.value } : prev)}
                  placeholder="বাংলায় শিরোনাম"
                  className="input w-full"
                  dir="auto"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Slug <span className="text-red-400">*</span>
                </label>
                <input
                  value={editing.slug ?? ""}
                  onChange={e => setEditing(prev => prev ? { ...prev, slug: e.target.value } : prev)}
                  placeholder="url-friendly-slug"
                  className="input w-full font-mono text-sm"
                />
              </div>

              {/* Category + Author */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Category</label>
                  <select
                    value={editing.category ?? ""}
                    onChange={e => setEditing(prev => prev ? { ...prev, category: e.target.value } : prev)}
                    className="input w-full text-sm"
                  >
                    <option value="">— Select —</option>
                    {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.replace(/-/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Author</label>
                  <input
                    value={editing.author_name ?? ""}
                    onChange={e => setEditing(prev => prev ? { ...prev, author_name: e.target.value } : prev)}
                    placeholder="ABO Enterprise"
                    className="input w-full"
                  />
                </div>
              </div>

              {/* Featured Image */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Featured Image URL</label>
                <input
                  value={editing.featured_image_url ?? ""}
                  onChange={e => setEditing(prev => prev ? { ...prev, featured_image_url: e.target.value } : prev)}
                  placeholder="https://..."
                  className="input w-full text-sm"
                />
              </div>

              {/* Excerpt EN */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Excerpt (English)</label>
                <textarea
                  value={editing.excerpt_en ?? ""}
                  onChange={e => setEditing(prev => prev ? { ...prev, excerpt_en: e.target.value } : prev)}
                  placeholder="Short summary shown in listing..."
                  rows={2}
                  className="input w-full resize-none text-sm"
                />
              </div>

              {/* Excerpt BN */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Excerpt (বাংলা)</label>
                <textarea
                  value={editing.excerpt_bn ?? ""}
                  onChange={e => setEditing(prev => prev ? { ...prev, excerpt_bn: e.target.value } : prev)}
                  placeholder="সংক্ষিপ্ত বিবরণ..."
                  rows={2}
                  className="input w-full resize-none text-sm"
                  dir="auto"
                />
              </div>

              {/* Content EN */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Content (English) <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={editing.content_en ?? ""}
                  onChange={e => setEditing(prev => prev ? { ...prev, content_en: e.target.value } : prev)}
                  placeholder="Full article content (Markdown or plain text)..."
                  rows={10}
                  className="input w-full resize-y text-sm font-mono leading-relaxed"
                />
              </div>

              {/* Content BN */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Content (বাংলা)</label>
                <textarea
                  value={editing.content_bn ?? ""}
                  onChange={e => setEditing(prev => prev ? { ...prev, content_bn: e.target.value } : prev)}
                  placeholder="পূর্ণ নিবন্ধ বিষয়বস্তু..."
                  rows={8}
                  className="input w-full resize-y text-sm leading-relaxed"
                  dir="auto"
                />
              </div>

              {/* SEO Section */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button type="button" onClick={() => setSeoOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SEO Settings</span>
                  {seoOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {seoOpen && (
                  <div className="px-4 py-4 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">SEO Title <span className="text-gray-400 font-normal">(defaults to post title)</span></label>
                      <input value={editing.seo_title ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, seo_title: e.target.value } : prev)} placeholder="Custom SEO title..." className="input w-full text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">SEO Description <span className="text-gray-400 font-normal">(max 160 chars)</span></label>
                      <textarea value={editing.seo_description ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, seo_description: e.target.value } : prev)} rows={2} maxLength={160} placeholder="Meta description for search engines..." className="input w-full resize-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Keywords <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                      <input value={editing.seo_keywords ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, seo_keywords: e.target.value } : prev)} placeholder="blog, technology, bangladesh..." className="input w-full text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Canonical URL <span className="text-gray-400 font-normal">(leave blank for default)</span></label>
                      <input value={editing.canonical_url ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, canonical_url: e.target.value } : prev)} placeholder="https://..." className="input w-full text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">OG Image URL <span className="text-gray-400 font-normal">(defaults to featured image)</span></label>
                      <input value={editing.og_image ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, og_image: e.target.value } : prev)} placeholder="https://..." className="input w-full text-sm" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50/50">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                {editing.status === "published"
                  ? <><Eye className="w-3.5 h-3.5 text-green-500" /> Visible on site</>
                  : <><EyeOff className="w-3.5 h-3.5 text-gray-400" /> Not yet published</>
                }
              </div>
              <div className="flex items-center gap-2">
                <button onClick={closeEditor} className="btn btn-outline btn-sm">Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn btn-primary btn-sm gap-1.5"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {isNew ? "Create Post" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
