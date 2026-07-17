"use client";

import { useEffect, useState, useCallback } from "react";
import AdminTitle from "@/components/admin/AdminTitle";
import { adminApi } from "@/lib/api";
import { Loader2, ScrollText, Search } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminToolbar from "@/components/admin/AdminToolbar";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  admin_email?: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-50 text-green-700",
  UPDATE: "bg-blue-50 text-blue-700",
  DELETE: "bg-red-50 text-red-700",
  LOGIN: "bg-purple-50 text-purple-700",
  LOGOUT: "bg-gray-100 text-gray-600",
};

function actionBadgeClass(action: string): string {
  return ACTION_COLORS[action.toUpperCase()] ?? "bg-gray-100 text-gray-700";
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const PER_PAGE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.listAuditLogs({ page, per_page: PER_PAGE });
      const data = (r.data.data ?? []) as AuditLog[];
      setLogs(data);
      setTotal(r.data.meta?.total ?? data.length);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const allEntities = [...new Set(logs.map((l) => l.entity_type))].sort();
  const allActions = [...new Set(logs.map((l) => l.action))].sort();

  const filtered = logs.filter((l) => {
    if (actionFilter && l.action !== actionFilter) return false;
    if (entityFilter && l.entity_type !== entityFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        l.action.toLowerCase().includes(q) ||
        l.entity_type.toLowerCase().includes(q) ||
        (l.entity_id ?? "").toLowerCase().includes(q) ||
        (l.admin_email ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-6 max-w-5xl">
      <AdminPageHeader
        title="Audit Logs"
        titleBn="অডিট লগ"
        description={`${total} total entries — review activity, entity changes, and admin actions`}
        descriptionBn={`${total}টি এন্ট্রি — activity, entity change এবং admin action পর্যালোচনা করুন`}
        actions={
          <div className="flex items-center gap-2 rounded-2xl bg-brand-50 px-3 py-2 text-brand-700">
            <ScrollText className="w-4 h-4" />
            <span className="text-sm font-semibold">{total} entries</span>
          </div>
        }
      />

      <AdminToolbar
        searchValue={search}
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        searchPlaceholder="Search logs…"
      >
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          aria-label="Filter by action"
          className="admin-input text-sm w-auto"
        >
          <option value="">All Actions</option>
          {allActions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          aria-label="Filter by entity"
          className="admin-input text-sm w-auto"
        >
          <option value="">All Entities</option>
          {allEntities.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </AdminToolbar>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-premium min-w-[500px]">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Record ID</th>
                  <th className="hidden md:table-cell">Admin</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id}>
                    <td className="text-gray-500 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("en-BD", {
                        year: "numeric", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td>
                      <span className={`badge text-xs font-semibold ${actionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="text-gray-700 capitalize">{log.entity_type.replace(/_/g, " ")}</td>
                    <td>
                      {log.entity_id ? (
                        <span
                          className="text-xs text-gray-400 font-mono cursor-default"
                          title={log.entity_id}
                        >
                          {log.entity_id.slice(0, 8)}…
                        </span>
                      ) : "—"}
                    </td>
                    <td className="text-xs text-gray-500 hidden md:table-cell">{log.admin_email ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="p-8 text-center text-gray-500">{search || actionFilter || entityFilter ? "No logs match your filter" : "No audit logs yet"}</p>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn btn-outline btn-sm"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50 rounded-lg border border-gray-200">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn btn-outline btn-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
