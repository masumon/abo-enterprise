"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Star, CheckCircle, XCircle } from "lucide-react";
import api from "@/lib/api";

interface AdminReview {
  id: string;
  reviewer_name: string;
  reviewer_email: string | null;
  rating: number;
  title: string | null;
  body: string;
  is_active: boolean;
  is_featured: boolean;
  product_id: string | null;
  created_at: string;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/api/v1/reviews/admin", { params: { page, per_page: 20 } });
      setReviews((r.data.data ?? []) as AdminReview[]);
      setTotal(r.data.meta?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (review: AdminReview) => {
    setTogglingId(review.id);
    try {
      await api.patch(`/api/v1/reviews/${review.id}/status`, { is_active: !review.is_active });
      setReviews(prev => prev.map(r => r.id === review.id ? { ...r, is_active: !r.is_active } : r));
    } catch {
      await load();
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="text-gray-500 text-sm mt-1">{total} total reviews</p>
      </div>

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center">
            <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No reviews found</p>
          </div>
        ) : (
          <table className="table-premium">
            <thead>
              <tr>
                <th>Reviewer</th>
                <th>Rating</th>
                <th>Review</th>
                <th>Date</th>
                <th>Visible</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{r.reviewer_name}</p>
                    {r.reviewer_email && <p className="text-xs text-gray-400">{r.reviewer_email}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium text-gray-900">{r.rating}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3 max-w-xs">
                    {r.title && <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>}
                    <p className="text-xs text-gray-500 truncate">{r.body}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString("en-BD")}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleActive(r)}
                      disabled={togglingId === r.id}
                      className="disabled:opacity-40 transition-colors"
                      title={r.is_active ? "Hide review" : "Show review"}
                    >
                      {r.is_active
                        ? <CheckCircle className="w-5 h-5 text-green-500" />
                        : <XCircle className="w-5 h-5 text-gray-300" />
                      }
                    </button>
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
          <button disabled={reviews.length < 20} onClick={() => setPage(p => p + 1)} className="btn btn-outline btn-sm">Next</button>
        </div>
      )}
    </div>
  );
}
