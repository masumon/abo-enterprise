"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Briefcase, X, ToggleLeft, ToggleRight } from "lucide-react";
import api from "@/lib/api";
import { formatPrice } from "@/lib/utils";

interface AdminService {
  id: string;
  name_en: string;
  name_bn: string;
  slug: string;
  category: string;
  base_price: number | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  description_en: string | null;
  created_at: string;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<AdminService[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminService | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/api/v1/services/admin/services", { params: { page, per_page: 20 } });
      setServices((r.data.data ?? []) as AdminService[]);
      setTotal(r.data.meta?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (service: AdminService) => {
    setTogglingId(service.id);
    try {
      await api.put(`/api/v1/services/admin/services/${service.id}`, { is_active: !service.is_active });
      await load();
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total services</p>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : services.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No services found</p>
          </div>
        ) : (
          <table className="table-premium">
            <thead>
              <tr>
                <th>Service</th>
                <th>Category</th>
                <th>Base Price</th>
                <th>Featured</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="cursor-pointer" onClick={() => setDetail(s)}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{s.name_en}</p>
                    <p className="text-xs text-gray-400">{s.name_bn}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600 capitalize">{s.category.replace(/_/g, " ")}</td>
                  <td className="px-5 py-3 text-gray-900">{s.base_price ? formatPrice(s.base_price) : "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.is_featured ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                      {s.is_featured ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => toggleActive(s)}
                      disabled={togglingId === s.id}
                      className="text-gray-400 hover:text-brand-600 transition-colors disabled:opacity-40"
                    >
                      {s.is_active
                        ? <ToggleRight className="w-6 h-6 text-green-500" />
                        : <ToggleLeft className="w-6 h-6" />
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
          <button disabled={services.length < 20} onClick={() => setPage(p => p + 1)} className="btn btn-outline btn-sm">Next</button>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setDetail(null)}>
          <div className="rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-scale-in" style={{ background: "rgba(255,255,255,0.98)", boxShadow: "0 24px 64px rgba(30,91,168,0.16), 0 8px 24px rgba(0,0,0,0.08)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{detail.name_en}</h2>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-500 text-xs">Name (BN)</p><p className="font-medium">{detail.name_bn}</p></div>
                <div><p className="text-gray-500 text-xs">Slug</p><p className="font-medium text-gray-600">{detail.slug}</p></div>
                <div><p className="text-gray-500 text-xs">Category</p><p className="font-medium capitalize">{detail.category.replace(/_/g, " ")}</p></div>
                <div><p className="text-gray-500 text-xs">Base Price</p><p className="font-medium">{detail.base_price ? formatPrice(detail.base_price) : "—"}</p></div>
                <div><p className="text-gray-500 text-xs">Sort Order</p><p className="font-medium">{detail.sort_order}</p></div>
                <div><p className="text-gray-500 text-xs">Created</p><p className="font-medium">{new Date(detail.created_at).toLocaleDateString("en-BD")}</p></div>
              </div>
              {detail.description_en && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-800">{detail.description_en}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
