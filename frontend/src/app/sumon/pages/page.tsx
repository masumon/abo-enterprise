"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { FileText, Loader2, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminToolbar from "@/components/admin/AdminToolbar";
import { adminPagesApi, type PageRecord } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import { cn } from "@/lib/utils";

const schema = z.object({
  slug: z.string().min(1, "Required").regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  title_en: z.string().min(1, "Required"),
  title_bn: z.string().optional(),
  content_en: z.string().min(1, "Required"),
  content_bn: z.string().optional(),
  status: z.enum(["draft", "published"]),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function AdminPagesPage() {
  const toast = useToastStore((s) => s.push);
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PageRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const PER_PAGE = 20;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "draft" },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminPagesApi.list({ page, per_page: PER_PAGE, status: statusFilter || undefined, search: search || undefined });
      const data = r.data.data ?? [];
      setPages(data);
      setTotal(r.data.meta?.total ?? data.length);
    } catch (err) {
      setPages([]);
      toast("error", apiErrorMessage(err, "Failed to load pages"));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    reset({ slug: "", title_en: "", title_bn: "", content_en: "", content_bn: "", status: "draft", seo_title: "", seo_description: "" });
    setShowModal(true);
  };

  const openEdit = (p: PageRecord) => {
    setEditing(p);
    reset({
      slug: p.slug, title_en: p.title_en, title_bn: p.title_bn ?? "",
      content_en: p.content_en, content_bn: p.content_bn ?? "",
      status: p.status, seo_title: p.seo_title ?? "", seo_description: p.seo_description ?? "",
    });
    setShowModal(true);
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      if (editing) {
        const { slug: _slug, ...updatable } = data;
        await adminPagesApi.update(editing.id, updatable);
        toast("success", "Page updated");
      } else {
        await adminPagesApi.create(data);
        toast("success", "Page created");
      }
      setShowModal(false);
      await load();
    } catch (err) {
      toast("error", apiErrorMessage(err, "Failed to save page"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: PageRecord) => {
    if (!confirm(`Delete "${p.title_en}"? This can't be undone from the admin UI.`)) return;
    try {
      await adminPagesApi.delete(p.id);
      toast("success", "Page deleted");
      await load();
    } catch (err) {
      toast("error", apiErrorMessage(err, "Failed to delete page"));
    }
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-6 max-w-5xl">
      <AdminPageHeader
        title="Pages"
        titleBn="পেজ"
        description={`${total} total — standalone content pages with their own URL, independent of blog/products/services`}
        descriptionBn={`${total}টি — ব্লগ/পণ্য/সেবা থেকে স্বতন্ত্র নিজস্ব URL সহ পেজ`}
        actions={
          <button type="button" onClick={openCreate} className="btn btn-brand btn-sm gap-1.5">
            <Plus className="w-4 h-4" /> New Page
          </button>
        }
      />

      <AdminToolbar searchValue={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search pages…">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="admin-input text-sm w-auto" aria-label="Filter by status">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </AdminToolbar>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : pages.length === 0 ? (
        <div className="admin-card p-10 text-center text-gray-400">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          {search || statusFilter ? "No pages match your filter" : "No pages yet — create one to get started"}
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-premium min-w-[600px]">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Slug</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium text-gray-800">{p.title_en}</td>
                    <td className="text-xs text-gray-500 font-mono">/{p.slug}</td>
                    <td>
                      <span className={cn("badge text-xs font-semibold", p.status === "published" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600")}>
                        {p.status}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">{new Date(p.updated_at).toLocaleDateString("en-BD")}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.status === "published" && (
                          <Link href={`/${p.slug}`} target="_blank" className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400" aria-label="View live">
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                        <button type="button" onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500" aria-label="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleDelete(p)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-500" aria-label="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn btn-outline btn-sm">Previous</button>
          <span className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50 rounded-lg border border-gray-200">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn btn-outline btn-sm">Next</button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editing ? "Edit Page" : "New Page"}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL path)</label>
                <input {...register("slug")} disabled={!!editing} className={cn("input", errors.slug && "input-error", editing && "opacity-60")} placeholder="about-our-warranty" />
                {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>}
                {editing && <p className="text-xs text-gray-400 mt-1">Slug can&apos;t be changed after creation.</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title (English)</label>
                  <input {...register("title_en")} className={cn("input", errors.title_en && "input-error")} />
                  {errors.title_en && <p className="text-red-500 text-xs mt-1">{errors.title_en.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title (বাংলা)</label>
                  <input {...register("title_bn")} className="input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content (English)</label>
                <textarea {...register("content_en")} rows={8} className={cn("input", errors.content_en && "input-error")} />
                {errors.content_en && <p className="text-red-500 text-xs mt-1">{errors.content_en.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content (বাংলা)</label>
                <textarea {...register("content_bn")} rows={8} className="input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SEO Title</label>
                  <input {...register("seo_title")} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select {...register("status")} className="input">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SEO Description</label>
                <textarea {...register("seo_description")} rows={2} className="input" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline btn-md">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-brand btn-md">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Save Changes" : "Create Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
