"use client";

import { useEffect, useState, useCallback } from "react";
import { careerAdminApi } from "@/lib/api";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Search, Loader2, ChevronLeft, ChevronRight, Trash2, Eye, Briefcase, Check, X } from "lucide-react";
import { useToastStore } from "@/store/toast";
import { apiErrorMessage } from "@/lib/apiError";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import CareerPositionsManager from "@/components/admin/CareerPositionsManager";
import ContactButtons from "@/components/admin/ContactButtons";

interface CareerApp {
  id: string;
  name: string;
  email?: string;
  phone: string;
  position: string;
  status: string;
  notes?: string;
  created_at: string;
}

interface CareerAppDetail extends CareerApp {
  cover_letter?: string;
  updated_at: string;
}

/** Hiring steps in plain Bangla (stored values unchanged). */
const STATUSES: { v: string; bn: string; icon: string; cls: string }[] = [
  { v: "new", bn: "নতুন", icon: "🆕", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  { v: "reviewing", bn: "দেখা হচ্ছে", icon: "👀", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  { v: "interviewed", bn: "সাক্ষাৎকার হয়েছে", icon: "🗣️", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  { v: "selected", bn: "নির্বাচিত", icon: "✅", cls: "bg-green-50 text-green-700 border-green-200" },
  { v: "rejected", bn: "বাদ", icon: "✖️", cls: "bg-red-50 text-red-700 border-red-200" },
];
const statusOf = (v: string) => STATUSES.find((s) => s.v === v) ?? { v, bn: v, icon: "•", cls: "bg-gray-50 text-gray-700 border-gray-200" };
const fmtDate = (d: string) => new Date(d).toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric" });

export default function CareerAdminPage() {
  const [apps, setApps] = useState<CareerApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedApp, setSelectedApp] = useState<CareerAppDetail | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const toast = useToastStore((s) => s.push);
  const per_page = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await careerAdminApi.list({ page, per_page, status: statusFilter || undefined, search: search || undefined });
      setApps(res.data.data);
      setTotal(res.data.meta?.total ?? 0);
    } catch (err) {
      toast("error", apiErrorMessage(err, "আবেদনগুলো আনা যায়নি"));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, per_page, toast]);

  useEffect(() => { void load(); }, [load]);

  const handleViewDetail = async (id: string) => {
    try {
      const res = await careerAdminApi.get(id);
      setSelectedApp(res.data.data);
    } catch {
      toast("error", "আবেদনের বিস্তারিত আনা যায়নি");
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string, notes?: string) => {
    setUpdating(id);
    try {
      await careerAdminApi.updateStatus(id, newStatus, notes);
      toast("success", notes !== undefined ? "নোট সেভ হয়েছে" : `অবস্থা: ${statusOf(newStatus).bn}`);
      if (notes === undefined) setSelectedApp((p) => (p && p.id === id ? { ...p, status: newStatus } : p));
      await load();
    } catch (err) {
      toast("error", apiErrorMessage(err, "অবস্থা বদলানো যায়নি"));
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await careerAdminApi.delete(id);
      toast("success", "আবেদন মুছে ফেলা হয়েছে");
      setSelectedApp(null);
      await load();
    } catch (err) {
      toast("error", apiErrorMessage(err, "মুছে ফেলা যায়নি"));
    } finally {
      setDeleting(null);
      setDeleteTargetId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / per_page));

  return (
    <div className="admin-page">
      <AdminPageHeader title="Career Applications" titleBn="চাকরির আবেদন" description="যারা চাকরির জন্য আবেদন করেছেন — দেখুন, কল করুন, অবস্থা বদলান" />

      <CareerPositionsManager />

      {/* Filters: search + status chips */}
      <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="নাম, ফোন বা ইমেইল দিয়ে খুঁজুন…" value={search} aria-label="খুঁজুন"
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input w-full pl-9" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[{ v: "", bn: "সব", icon: "📋" }, ...STATUSES].map((s) => (
            <button key={s.v || "all"} type="button" onClick={() => { setStatusFilter(s.v); setPage(1); }}
              className={`flex-shrink-0 rounded-full border px-3 min-h-10 text-sm whitespace-nowrap ${statusFilter === s.v ? "bg-brand-600 text-white border-brand-600 font-semibold" : "border-gray-200 dark:border-white/10"}`}>
              {s.icon} {s.bn}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />)}</div>
      ) : apps.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-60" />
          <p>{search || statusFilter ? "এই খোঁজে কোনো আবেদন নেই" : "এখনো কোনো আবেদন আসেনি"}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {apps.map((app) => {
              const st = statusOf(app.status);
              return (
                <article key={app.id} className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 shadow-sm">
                  <button type="button" onClick={() => handleViewDetail(app.id)} className="block w-full text-left min-h-11">
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block font-semibold text-heading break-words">{app.name}</span>
                        <span className="block text-sm text-muted break-words">💼 {app.position}</span>
                      </span>
                      <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border ${st.cls}`}>{st.icon} {st.bn}</span>
                    </span>
                    <span className="mt-1 block text-xs text-muted">📞 {app.phone} · আবেদন: {fmtDate(app.created_at)}</span>
                  </button>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 dark:border-white/10 pt-3">
                    <ContactButtons phone={app.phone} email={app.email} />
                    <button type="button" onClick={() => handleViewDetail(app.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/10 px-3 min-h-11 text-xs font-semibold"><Eye className="w-4 h-4" /> দেখুন</button>
                    <button type="button" onClick={() => setDeleteTargetId(app.id)} disabled={deleting === app.id} aria-label="মুছুন"
                      className="ml-auto inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-gray-400 hover:text-red-600 disabled:opacity-60">
                      {deleting === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted">মোট {total}টি আবেদন</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} aria-label="আগের পাতা" className="min-h-11 min-w-11 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
              <span className="px-2 text-sm font-medium">{page} / {totalPages}</span>
              <button type="button" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} aria-label="পরের পাতা" className="min-h-11 min-w-11 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </>
      )}

      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 max-[640px]:items-end max-[640px]:p-0" onClick={() => setSelectedApp(null)}>
          <div role="dialog" aria-modal="true" aria-label="আবেদনের বিস্তারিত" onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto max-[640px]:max-h-[94dvh] max-[640px]:rounded-b-none">
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-heading break-words">{selectedApp.name}</h2>
                <p className="text-sm text-muted break-words">💼 {selectedApp.position}</p>
              </div>
              <button type="button" onClick={() => setSelectedApp(null)} aria-label="বন্ধ" className="min-h-11 min-w-11 flex items-center justify-center text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-5">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-200">📞 {selectedApp.phone}{selectedApp.email ? ` · ✉️ ${selectedApp.email}` : ""}</p>
                <ContactButtons phone={selectedApp.phone} email={selectedApp.email} className="mt-2" />
              </div>

              {selectedApp.cover_letter && (
                <div>
                  <p className="text-xs font-semibold text-muted mb-1.5">আবেদনকারীর লেখা</p>
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">{selectedApp.cover_letter}</div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-muted mb-2">অবস্থা বদলান</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STATUSES.map((s) => (
                    <button key={s.v} type="button" onClick={() => handleUpdateStatus(selectedApp.id, s.v)} disabled={updating === selectedApp.id}
                      className={`rounded-xl border px-3 min-h-11 text-sm text-left ${selectedApp.status === s.v ? "bg-brand-600 text-white border-brand-600 font-semibold" : "border-gray-200 dark:border-white/10"} disabled:opacity-60`}>
                      {selectedApp.status === s.v ? <Check className="w-4 h-4 inline mr-1" /> : <span className="mr-1">{s.icon}</span>}{s.bn}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted mb-1.5 flex items-center justify-between">
                  <span>নিজের নোট (শুধু অ্যাডমিন দেখবেন)</span>
                  {updating === selectedApp.id && <span className="text-brand-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> সেভ হচ্ছে…</span>}
                </p>
                <textarea
                  placeholder="যেমন: সোমবার ১১টায় সাক্ষাৎকার — বাইরে চাপ দিলে নিজে থেকে সেভ হবে"
                  defaultValue={selectedApp.notes}
                  onBlur={(e) => {
                    if (e.target.value !== (selectedApp.notes || "")) {
                      void handleUpdateStatus(selectedApp.id, selectedApp.status, e.target.value).then(() => handleViewDetail(selectedApp.id));
                    }
                  }}
                  className="input w-full text-sm resize-none" rows={4} dir="auto"
                />
              </div>

              <div className="text-xs text-muted space-y-1 border-t border-gray-200 dark:border-white/10 pt-3">
                <p>আবেদন: {new Date(selectedApp.created_at).toLocaleString("bn-BD")}</p>
                <p>শেষ পরিবর্তন: {new Date(selectedApp.updated_at).toLocaleString("bn-BD")}</p>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setDeleteTargetId(selectedApp.id)} className="btn btn-outline min-h-11 gap-1.5 text-red-600"><Trash2 className="w-4 h-4" /> মুছুন</button>
                <button type="button" onClick={() => setSelectedApp(null)} className="btn btn-brand min-h-11 flex-1">বন্ধ করুন</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="আবেদন মুছবেন?"
        message="মুছে ফেললে আর ফেরানো যাবে না। শুধু বাদ দিতে চাইলে অবস্থা “বাদ” করুন।"
        confirmLabel="মুছুন"
        variant="danger"
        onConfirm={() => deleteTargetId && handleDelete(deleteTargetId)}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
