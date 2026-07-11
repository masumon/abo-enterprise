"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import AdminTitle from "@/components/admin/AdminTitle";
import { Loader2, BookOpen, Plus, Pencil, Trash2, X, Star, Eye, EyeOff, ChevronDown, ChevronUp, ExternalLink, Globe, Copy } from "lucide-react";
import { adminBlogApi } from "@/lib/api";
import ImageUpload from "@/components/admin/ImageUpload";
import type { BlogPost } from "@/types";
import StatusBadge from "@/components/admin/StatusBadge";
import { useToastStore } from "@/store/toast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

const CATEGORIES = ["technology", "business", "tips", "news", "case-study", "announcement"];
const DRAFT_KEY = "admin_blog_new_draft";

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

async function translateText(text: string, from = "bn", to = "en"): Promise<string> {
  if (!text.trim()) return "";
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`
    );
    const data = await res.json();
    return (data?.responseData?.translatedText as string) ?? text;
  } catch {
    return text;
  }
}

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
  const [enOpen, setEnOpen] = useState(false);
  const [translating, setTranslating] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const toast = useToastStore((s) => s.push);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminBlogApi.list({ status: statusFilter || undefined, page, per_page: 20 });
      setPosts((r.data.data ?? []) as unknown as BlogPost[]);
      setTotal(r.data.meta?.total ?? 0);
    } catch {
      toast("error", "Failed to load posts. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isNew || !editing) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(editing)); } catch { /* storage full */ }
    }, 1000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [editing, isNew]);

  const openNew = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<BlogPost>;
        setEditing(parsed);
        toast("info", "Draft restored from last session");
      } else {
        setEditing({ ...EMPTY_FORM });
      }
    } catch {
      setEditing({ ...EMPTY_FORM });
    }
    setIsNew(true);
    setSeoOpen(false);
  };

  const openEdit = (post: BlogPost) => {
    setEditing({ ...post });
    setIsNew(false);
    setSeoOpen(false);
  };

  const closeEditor = (discardDraft = false) => {
    if (discardDraft && isNew) {
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    }
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

  const handleClone = async (p: BlogPost) => {
    const clone: Partial<BlogPost> = {
      ...EMPTY_FORM,
      title_en: `${p.title_en} (Copy)`,
      title_bn: p.title_bn ? `${p.title_bn} (কপি)` : "",
      slug: `${p.slug}-copy`,
      content_en: p.content_en,
      content_bn: p.content_bn,
      excerpt_en: p.excerpt_en,
      excerpt_bn: p.excerpt_bn,
      category: p.category,
      author_name: p.author_name,
      featured_image_url: p.featured_image_url,
      status: "draft",
      is_featured: false,
    };
    setEditing(clone);
    setIsNew(true);
    setSeoOpen(false);
    toast("info", "Cloned as draft — edit and save to publish");
  };

  const handleTranslate = async (field: "title" | "excerpt" | "content" | "all") => {
    if (!editing) return;
    setTranslating(field);
    try {
      const updates: Partial<BlogPost> = {};
      if (field === "title" || field === "all") {
        const bn = editing.title_bn?.trim();
        if (bn) {
          const translated = await translateText(bn);
          updates.title_en = translated;
          if (isNew || !editing.slug) updates.slug = slugify(translated);
        }
      }
      if (field === "excerpt" || field === "all") {
        const bn = editing.excerpt_bn?.trim();
        if (bn) updates.excerpt_en = await translateText(bn);
      }
      if (field === "content" || field === "all") {
        const bn = editing.content_bn?.trim();
        if (bn) updates.content_en = await translateText(bn);
      }
      if (Object.keys(updates).length > 0) {
        setEditing(prev => prev ? { ...prev, ...updates } : prev);
        toast("success", "Translation complete");
      } else {
        toast("info", "Nothing to translate — fill Bengali fields first");
      }
    } catch {
      toast("error", "Translation failed. Try again.");
    } finally {
      setTranslating(null);
    }
  };

  const handleSave = async () => {
    if (!editing) return;

    // Bangla-first flow: if English is empty but Bangla is written,
    // auto-translate at save time so the admin never has to fill EN by hand.
    let post = { ...editing };
    const needsTitle = !post.title_en?.trim() && !!post.title_bn?.trim();
    const needsContent = !post.content_en?.trim() && !!post.content_bn?.trim();
    const needsExcerpt = !post.excerpt_en?.trim() && !!post.excerpt_bn?.trim();
    if (needsTitle || needsContent || needsExcerpt) {
      setSaving(true);
      try {
        if (needsTitle) {
          post.title_en = await translateText(post.title_bn!.trim());
          if (isNew || !post.slug?.trim()) post.slug = slugify(post.title_en);
        }
        if (needsExcerpt) post.excerpt_en = await translateText(post.excerpt_bn!.trim());
        if (needsContent) post.content_en = await translateText(post.content_bn!.trim());
        setEditing(post);
        toast("info", "বাংলা থেকে ইংরেজি অনুবাদ হয়েছে — English Version সেকশনে দেখে নিতে পারেন");
      } catch {
        setSaving(false);
        toast("error", "অটো-অনুবাদ ব্যর্থ — Translate বাটন চাপুন বা English নিজে লিখুন");
        return;
      }
      setSaving(false);
    }

    if (!post.title_en?.trim() && !post.title_bn?.trim()) { toast("error", "Title দিন (বাংলা বা English)"); return; }
    if (!post.title_en?.trim()) { toast("error", "Title (EN) is required"); return; }
    if (!post.slug?.trim()) { toast("error", "Slug is required"); return; }
    if (!post.content_en?.trim()) { toast("error", "Content দিন (বাংলা লিখলে অটো-অনুবাদ হবে)"); return; }
    if (!post.category?.trim()) { toast("error", "Category is required"); return; }
    const editingFinal = post;

    setSaving(true);
    try {
      if (isNew) {
        await adminBlogApi.create(editingFinal);
        try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
        toast("success", "Post created successfully");
      } else {
        await adminBlogApi.update(editingFinal.id!, editingFinal);
        toast("success", "Post updated successfully");
      }
      closeEditor();
      await load();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast("error", detail ?? (isNew ? "Failed to create post" : "Failed to update post"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      title: "Delete this post?",
      message: "This action cannot be undone. The post will be permanently removed.",
      action: async () => {
        setConfirmState(null);
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
      },
    });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <AdminTitle en="Blog" bn="ব্লগ" />
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
          <div className="overflow-x-auto">
            <table className="table-premium min-w-[640px]">
              <thead>
                <tr>
                  <th>Title</th>
                  <th className="hidden sm:table-cell">Category</th>
                  <th className="hidden md:table-cell">Author</th>
                  <th className="hidden md:table-cell">Date</th>
                  <th>Status</th>
                  <th className="text-right pr-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id} onClick={() => openEdit(p)} className="cursor-pointer hover:bg-brand-50/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {p.is_featured && <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                        <div>
                          <p className="font-medium text-gray-900 truncate max-w-[200px] sm:max-w-[280px]">{p.title_en}</p>
                          <p className="text-xs text-gray-400">{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600 capitalize hidden sm:table-cell">{p.category ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-600 hidden md:table-cell">{p.author_name}</td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">
                      {p.published_at
                        ? new Date(p.published_at).toLocaleDateString("en-BD")
                        : p.created_at
                          ? new Date(p.created_at).toLocaleDateString("en-BD")
                          : "—"}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {p.status === "draft" && (
                          <button
                            onClick={async (e) => { e.stopPropagation(); await adminBlogApi.update(p.id!, { status: "published" }); toast("success", "Published!"); load(); }}
                            className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 whitespace-nowrap transition-colors"
                            title="Publish now"
                          >Publish</button>
                        )}
                        {p.status === "published" && (
                          <a
                            href={`/blog/${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="View on site"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleClone(p); }}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Clone / Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(p.id!); }}
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
          </div>
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
              <button onClick={() => closeEditor(false)} className="text-gray-400 hover:text-gray-600">
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
                  {editing.status === "published" && (
                    <div className="mt-2">
                      <label className="block text-xs text-gray-500 mb-1">Publish Date</label>
                      <input
                        type="datetime-local"
                        value={editing.published_at ? editing.published_at.slice(0, 16) : ""}
                        onChange={e => setEditing(prev => prev ? { ...prev, published_at: e.target.value || undefined } : prev)}
                        className="input w-full text-sm"
                      />
                      <p className="text-xs text-gray-400 mt-0.5">Leave blank to use current time</p>
                    </div>
                  )}
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

              {/* Translate All button */}
              <div className="flex items-center justify-between p-3 bg-brand-50 border border-brand-100 rounded-xl">
                <div className="flex items-center gap-2 text-xs text-brand-700">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Write in Bengali — auto-translate to English</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTranslate("all")}
                  disabled={translating !== null}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {translating === "all" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                  Translate All
                </button>
              </div>

              {/* Title BN — primary */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Title (বাংলা)</label>
                  <button
                    type="button"
                    onClick={() => handleTranslate("title")}
                    disabled={!editing.title_bn?.trim() || translating !== null}
                    className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 disabled:opacity-40"
                  >
                    {translating === "title" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                    → English
                  </button>
                </div>
                <input
                  value={editing.title_bn ?? ""}
                  onChange={e => setEditing(prev => prev ? { ...prev, title_bn: e.target.value } : prev)}
                  placeholder="বাংলায় শিরোনাম লিখুন"
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
              <ImageUpload
                label="Featured Image"
                value={editing.featured_image_url ?? ""}
                onChange={(url) => setEditing(prev => prev ? { ...prev, featured_image_url: url } : prev)}
                folder="abo-enterprise/blog"
              />

              {/* Excerpt BN — primary */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Excerpt (বাংলা)</label>
                  <button
                    type="button"
                    onClick={() => handleTranslate("excerpt")}
                    disabled={!editing.excerpt_bn?.trim() || translating !== null}
                    className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 disabled:opacity-40"
                  >
                    {translating === "excerpt" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                    → English
                  </button>
                </div>
                <textarea
                  value={editing.excerpt_bn ?? ""}
                  onChange={e => setEditing(prev => prev ? { ...prev, excerpt_bn: e.target.value } : prev)}
                  placeholder="সংক্ষিপ্ত বিবরণ লিখুন..."
                  rows={2}
                  className="input w-full resize-none text-sm"
                  dir="auto"
                />
              </div>

              {/* Content BN — primary */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Content (বাংলা)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleTranslate("content")}
                    disabled={!editing.content_bn?.trim() || translating !== null}
                    className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 disabled:opacity-40"
                  >
                    {translating === "content" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                    → English
                  </button>
                </div>
                <textarea
                  value={editing.content_bn ?? ""}
                  onChange={e => setEditing(prev => prev ? { ...prev, content_bn: e.target.value } : prev)}
                  placeholder="বাংলায় পূর্ণ নিবন্ধ লিখুন..."
                  rows={10}
                  className="input w-full resize-y text-sm leading-relaxed"
                  dir="auto"
                />
              </div>

              {/* English version — auto-translated on save; open to review/edit */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button type="button" onClick={() => setEnOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    English Version
                    <span className="ml-1.5 text-gray-400 font-normal normal-case">— বাংলা লিখে Save দিলে অটো-অনুবাদ হয়; দেখতে/সম্পাদনা করতে খুলুন</span>
                  </span>
                  {enOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {enOpen && (
                  <div className="px-4 py-4 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Title (English)</label>
                      <input
                        value={editing.title_en ?? ""}
                        onChange={e => handleTitleChange(e.target.value)}
                        placeholder="Auto-filled from Bangla on save"
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Excerpt (English)</label>
                      <textarea
                        value={editing.excerpt_en ?? ""}
                        onChange={e => setEditing(prev => prev ? { ...prev, excerpt_en: e.target.value } : prev)}
                        placeholder="Auto-filled from Bangla on save"
                        rows={2}
                        className="input w-full resize-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Content (English)</label>
                      <textarea
                        value={editing.content_en ?? ""}
                        onChange={e => setEditing(prev => prev ? { ...prev, content_en: e.target.value } : prev)}
                        placeholder="Auto-filled from Bangla on save"
                        rows={8}
                        className="input w-full resize-y text-sm leading-relaxed"
                      />
                    </div>
                  </div>
                )}
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-gray-600">SEO Description</label>
                        <span className={`text-xs ${(editing.seo_description?.length ?? 0) > 155 ? "text-red-500" : "text-gray-400"}`}>
                          {editing.seo_description?.length ?? 0}/160
                        </span>
                      </div>
                      <textarea value={editing.seo_description ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, seo_description: e.target.value.slice(0, 160) } : prev)} rows={2} maxLength={160} placeholder="Meta description for search engines..." className="input w-full resize-none text-sm" />
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
                      <label className="block text-xs font-medium text-gray-600 mb-1">OG Image <span className="text-gray-400 font-normal">(defaults to featured image)</span></label>
                      <ImageUpload
                        value={editing.og_image ?? ""}
                        onChange={(url) => setEditing(prev => prev ? { ...prev, og_image: url } : prev)}
                        folder="abo-enterprise/blog"
                        previewSize="sm"
                      />
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
                {isNew && (
                  <button onClick={() => closeEditor(true)} className="btn btn-outline btn-sm text-red-500 border-red-200 hover:bg-red-50">Discard Draft</button>
                )}
                <button onClick={() => closeEditor(false)} className="btn btn-outline btn-sm">Cancel</button>
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

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title ?? ""}
        message={confirmState?.message ?? ""}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => confirmState?.action()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
