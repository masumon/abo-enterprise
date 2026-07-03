"use client";

import { useEffect, useState, useCallback } from "react";
import { careerAdminApi } from "@/lib/api";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Search, Loader2, ChevronLeft, ChevronRight, Trash2, Eye, AlertCircle, Check, Clock } from "lucide-react";
import { useToastStore } from "@/store/toast";
import { apiErrorMessage } from "@/lib/apiError";

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

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  reviewing: "bg-amber-50 text-amber-700 border-amber-200",
  interviewed: "bg-purple-50 text-purple-700 border-purple-200",
  selected: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

export default function CareerAdminPage() {
  const [apps, setApps] = useState<CareerApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedApp, setSelectedApp] = useState<CareerAppDetail | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const toast = useToastStore((s) => s.push);
  const per_page = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await careerAdminApi.list({
        page,
        per_page,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setApps(res.data.data);
      setTotal(res.data.meta?.total ?? 0);
    } catch (err) {
      toast("error", apiErrorMessage(err, "Failed to load applications"));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, per_page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleViewDetail = async (id: string) => {
    try {
      const res = await careerAdminApi.get(id);
      setSelectedApp(res.data.data);
    } catch (err) {
      toast("error", "Failed to load application details");
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdating(id);
    try {
      await careerAdminApi.updateStatus(id, newStatus);
      toast("success", "Status updated");
      setSelectedApp(null);
      await load();
    } catch (err) {
      toast("error", apiErrorMessage(err, "Failed to update status"));
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this application?")) return;
    setDeleting(id);
    try {
      await careerAdminApi.delete(id);
      toast("success", "Application deleted");
      setSelectedApp(null);
      await load();
    } catch (err) {
      toast("error", apiErrorMessage(err, "Failed to delete application"));
    } finally {
      setDeleting(null);
    }
  };

  const totalPages = Math.ceil(total / per_page);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Career Applications"
        titleBn="ক্যারিয়ার আবেদন"
        description="View and manage job applications"
      />

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="reviewing">Reviewing</option>
            <option value="interviewed">Interviewed</option>
            <option value="selected">Selected</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No applications found</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 hidden sm:table-cell">Position</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 hidden md:table-cell">Phone</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 hidden md:table-cell">Applied</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {apps.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{app.name}</p>
                        {app.email && <p className="text-xs text-gray-500">{app.email}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{app.position}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{app.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[app.status] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleViewDetail(app.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(app.id)}
                        disabled={deleting === app.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium disabled:opacity-60"
                      >
                        {deleting === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {Math.min(page * per_page, total)} of {total} applications
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="flex items-center px-3 text-sm font-medium text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Application Details</h2>
              <button onClick={() => setSelectedApp(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Applicant Info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Name</label>
                  <p className="text-gray-900 font-medium">{selectedApp.name}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phone</label>
                  <p className="text-gray-900">{selectedApp.phone}</p>
                </div>
                {selectedApp.email && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
                    <p className="text-gray-900">{selectedApp.email}</p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Position</label>
                  <p className="text-gray-900">{selectedApp.position}</p>
                </div>
              </div>

              {/* Cover Letter */}
              {selectedApp.cover_letter && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Cover Letter</label>
                  <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedApp.cover_letter}
                  </div>
                </div>
              )}

              {/* Status & Notes */}
              <div className="space-y-4 border-t border-gray-200 pt-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {["new", "reviewing", "interviewed", "selected", "rejected"].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleUpdateStatus(selectedApp.id, s)}
                        disabled={updating === selectedApp.id}
                        className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${
                          selectedApp.status === s
                            ? "bg-brand-600 text-white border-brand-600"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300"
                        } disabled:opacity-60`}
                      >
                        {updating === selectedApp.id && selectedApp.status === s ? (
                          <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                        ) : selectedApp.status === s ? (
                          <Check className="w-3 h-3 inline mr-1" />
                        ) : null}
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Notes</label>
                  <textarea
                    placeholder="Add internal notes..."
                    defaultValue={selectedApp.notes}
                    onBlur={(e) => {
                      if (e.target.value !== (selectedApp.notes || "")) {
                        handleUpdateStatus(selectedApp.id, selectedApp.status).then(() => {
                          if (selectedApp) {
                            handleViewDetail(selectedApp.id);
                          }
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-brand-400 resize-none"
                    rows={4}
                  />
                </div>
              </div>

              {/* Meta */}
              <div className="text-xs text-gray-500 space-y-1 border-t border-gray-200 pt-4">
                <p>Applied: {new Date(selectedApp.created_at).toLocaleString()}</p>
                <p>Updated: {new Date(selectedApp.updated_at).toLocaleString()}</p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedApp(null)}
                className="w-full py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
