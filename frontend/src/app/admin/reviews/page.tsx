"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Star, CheckCircle, XCircle, Trash2, Shield, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
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
  created_at: string;
}

export default function AdminReviewsPage() {
  const toast = useToastStore((s) => s.push);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const patch = async (review: AdminReview, update: Partial<Pick<AdminReview, "is_active" | "is_featured" | "is_verified">>) => {
    setBusyId(review.id);
    try {
      await api.patch(`/api/v1/reviews/${review.id}`, update);
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, ...update } : r))
      );
      toast("success", "Review updated");
    } catch {
      toast("error", "Update failed");
    } finally {
      setBusyId(null);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="text-gray-500 text-sm mt-1">{total} total reviews</p>
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rating</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Review</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Source</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
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
                      <td className="px-5 py-3 max-w-xs">
                        <p className="text-sm text-gray-700 line-clamp-2">{r.review_en}</p>
                        {r.review_bn && <p className="text-xs text-gray-400 truncate mt-0.5">{r.review_bn}</p>}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                          {r.source}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap text-xs">
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
                        <button
                          onClick={() => handleDelete(r.id, r.customer_name)}
                          disabled={busy}
                          title="Delete review"
                          className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
    </div>
  );
}
