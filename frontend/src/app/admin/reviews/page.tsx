"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Star, CheckCircle, XCircle, Trash2, Shield, ShieldCheck, Pencil, X, MessageSquare, Plus } from "lucide-react";
import api, { reviewsApi } from "@/lib/api";
import ImageUpload from "@/components/admin/ImageUpload";
import { useToastStore } from "@/store/toast";

interface AdminReview {
  id: string;
  customer_name: string;
  company: string | null;
  rating: number;
  review_en: string;
  review_bn: string | null;
  photo_url: string | null;
  source: string;
  is_active: boolean;
  is_featured: boolean;
  is_verified: boolean;
  product_id: string | null;
  admin_reply: string | null;
  admin_reply_at: string | null;
  created_at: string;
}

export default function AdminReviewsPage() {
  const toast = useToastStore((s) => s.push);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminReview | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Partial<AdminReview>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/api/v1/reviews/admin", { params: { page, per_page: 20 } });
      setReviews((r.data.data ?? []) as AdminReview[]);
      setTotal(r.data.meta?.total ?? 0);
    } catch {
      toast("error", "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => { load(); }, [load]);

  const patch = async (review: AdminReview, update: Partial<AdminReview>) => {
    setBusyId(review.id);
    try {
      await api.patch(`/api/v1/reviews/${review.id}`, update);
      setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, ...update } : r)));
      toast("success", "Review updated");
    } catch {
      toast("error", "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const openCreate = () => {
    setCreating(true);
    setEditing(null);
    setDraft({
      customer_name: "",
      company: "",
      rating: 5,
      review_en: "",
      review_bn: "",
      photo_url: "",
      source: "direct",
      is_active: true,
      is_featured: false,
      is_verified: false,
    });
  };

  const openEdit = (r: AdminReview) => {
    setCreating(false);
    setEditing(r);
    setDraft({
      customer_name: r.customer_name,
      company: r.company ?? "",
      rating: r.rating,
      review_en: r.review_en,
      review_bn: r.review_bn ?? "",
      photo_url: r.photo_url ?? "",
      source: r.source,
      admin_reply: r.admin_reply ?? "",
    });
  };

  const closeEdit = () => { setEditing(null); setCreating(false); setDraft({}); };

  const handleSave = async () => {
    if (creating) {
      if (!draft.customer_name?.trim() || !draft.review_en?.trim()) {
        toast("error", "Customer name and review text are required");
        return;
      }
      setSaving(true);
      try {
        const res = await reviewsApi.create({
          customer_name: draft.customer_name,
          company: draft.company || undefined,
          rating: draft.rating ?? 5,
          review_en: draft.review_en,
          review_bn: draft.review_bn || undefined,
          photo_url: draft.photo_url || undefined,
          source: draft.source ?? "direct",
        });
        let created = res.data.data as AdminReview;
        const flags: Partial<AdminReview> = {};
        if (draft.is_active === false) flags.is_active = false;
        if (draft.is_featured) flags.is_featured = true;
        if (draft.is_verified) flags.is_verified = true;
        if (Object.keys(flags).length > 0) {
          const patchRes = await api.patch(`/api/v1/reviews/${created.id}`, flags);
          created = patchRes.data.data as AdminReview;
        }
        setReviews((prev) => [created, ...prev]);
        setTotal((t) => t + 1);
        toast("success", "Review created");
        closeEdit();
      } catch {
        toast("error", "Create failed");
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!editing) return;
    setSaving(true);
    try {
      const res = await api.patch(`/api/v1/reviews/${editing.id}`, draft);
      const updated = res.data.data as AdminReview;
      setReviews((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...updated } : r)));
      toast("success", "Review saved");
      closeEdit();
    } catch {
      toast("error", "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete review from "${name}"? This cannot be undone.`)) return;
    setBusyId(id);
    try {
      await api.delete(`/api/v1/reviews/${id}`);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setTotal((t) => t - 1);
      toast("success", "Review deleted");
    } catch {
      toast("error", "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const stars = (n: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-3.5 h-3.5 ${i < n ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
    ));

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total reviews</p>
        </div>
        <button onClick={openCreate} className="btn btn-brand btn-md flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Review
        </button>
      </div>

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center">
            <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No reviews found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rating</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Review</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Source</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Active</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Featured</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Verified</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reviews.map((r) => {
                  const busy = busyId === r.id;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          {r.photo_url ? (
                            <img src={r.photo_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-brand-600">{r.customer_name[0]?.toUpperCase()}</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{r.customer_name}</p>
                            {r.company && <p className="text-xs text-gray-400 truncate">{r.company}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-0.5">{stars(r.rating)}</div>
                        <p className="text-xs text-gray-400 mt-0.5">{r.rating}/5</p>
                      </td>
                      <td className="px-5 py-3 max-w-xs hidden sm:table-cell">
                        <p className="text-sm text-gray-700 line-clamp-2">{r.review_en}</p>
                        {r.review_bn && <p className="text-xs text-gray-400 truncate mt-0.5">{r.review_bn}</p>}
                        {r.admin_reply && (
                          <p className="text-xs text-brand-600 mt-1 line-clamp-1">
                            <MessageSquare className="w-3 h-3 inline mr-0.5" />
                            {r.admin_reply}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                          {r.source}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap text-xs hidden md:table-cell">
                        {new Date(r.created_at).toLocaleDateString("en-BD")}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => patch(r, { is_active: !r.is_active })}
                          disabled={busy}
                          title={r.is_active ? "Hide review" : "Show review"}
                          className="disabled:opacity-40 transition-colors"
                        >
                          {r.is_active
                            ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                            : <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                          }
                        </button>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => patch(r, { is_featured: !r.is_featured })}
                          disabled={busy}
                          title={r.is_featured ? "Remove from featured" : "Mark as featured"}
                          className="disabled:opacity-40 transition-colors"
                        >
                          <Star className={`w-5 h-5 mx-auto ${r.is_featured ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                        </button>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => patch(r, { is_verified: !r.is_verified })}
                          disabled={busy}
                          title={r.is_verified ? "Remove verification" : "Mark as verified"}
                          className="disabled:opacity-40 transition-colors"
                        >
                          {r.is_verified
                            ? <ShieldCheck className="w-5 h-5 text-brand-500 mx-auto" />
                            : <Shield className="w-5 h-5 text-gray-300 mx-auto" />
                          }
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(r)}
                            title="Edit / Reply"
                            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id, r.customer_name)}
                            disabled={busy}
                            title="Delete review"
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                          >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {page}</span>
          <button
            disabled={reviews.length < 20}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Edit / Create slide-in panel */}
      {(editing || creating) && (
        <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="ml-auto w-full max-w-lg h-full flex flex-col bg-white shadow-2xl animate-slide-in-right overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">{creating ? "New Review" : "Edit Review"}</h2>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Customer Info */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Customer Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Customer Name</label>
                    <input
                      value={draft.customer_name ?? ""}
                      onChange={e => setDraft(d => ({ ...d, customer_name: e.target.value }))}
                      className="input w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="form-label">Company</label>
                    <input
                      value={draft.company ?? ""}
                      onChange={e => setDraft(d => ({ ...d, company: e.target.value }))}
                      className="input w-full text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Rating (1–5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={draft.rating ?? 5}
                      onChange={e => setDraft(d => ({ ...d, rating: Number(e.target.value) }))}
                      className="input w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="form-label">Source</label>
                    <select
                      value={draft.source ?? "direct"}
                      onChange={e => setDraft(d => ({ ...d, source: e.target.value }))}
                      className="input w-full text-sm"
                    >
                      {["direct", "google", "facebook", "website", "other"].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Photo</label>
                  <ImageUpload
                    value={draft.photo_url ?? ""}
                    onChange={(url) => setDraft(d => ({ ...d, photo_url: url }))}
                    folder="abo-enterprise/reviews"
                    previewSize="sm"
                  />
                </div>
              </section>

              {/* Review Content */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Review Content</h3>
                <div>
                  <label className="form-label">Review (English)</label>
                  <textarea
                    rows={4}
                    value={draft.review_en ?? ""}
                    onChange={e => setDraft(d => ({ ...d, review_en: e.target.value }))}
                    className="input w-full resize-y text-sm"
                  />
                </div>
                <div>
                  <label className="form-label">Review (বাংলা)</label>
                  <textarea
                    rows={3}
                    value={draft.review_bn ?? ""}
                    onChange={e => setDraft(d => ({ ...d, review_bn: e.target.value }))}
                    className="input w-full resize-y text-sm"
                    dir="auto"
                  />
                </div>
              </section>

              {/* Admin Reply */}
              {!creating && (
              <section className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Admin Reply
                </h3>
                {editing?.admin_reply_at && (
                  <p className="text-xs text-gray-400">
                    Last replied: {new Date(editing.admin_reply_at).toLocaleString("en-BD")}
                  </p>
                )}
                <textarea
                  rows={4}
                  value={draft.admin_reply ?? ""}
                  onChange={e => setDraft(d => ({ ...d, admin_reply: e.target.value }))}
                  placeholder="Write a reply that will be shown publicly alongside this review…"
                  className="input w-full resize-y text-sm"
                />
                <p className="text-[11px] text-gray-400">Leave empty to remove the existing reply.</p>
              </section>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50/50">
              <button onClick={closeEdit} className="btn btn-outline btn-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {creating ? "Create Review" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
