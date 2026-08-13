"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import AdminTitle from "@/components/admin/AdminTitle";
import { adminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
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
  const toast = useToastStore((s) => s.push);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  // Distinct values across the WHOLE audit trail (not just the current page),
  // so the dropdowns don't miss actions/entities that only appear elsewhere.
  const [allActions, setAllActions] = useState<string[]>([]);
  const [allEntities, setAllEntities] = useState<string[]>([]);
  const PER_PAGE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.listAuditLogs({
        page, per_page: PER_PAGE,
        action: actionFilter || undefined,
        entity_type: entityFilter || undefined,
        search: search || undefined,
      });
      const data = (r.data.data ?? []) as AuditLog[];
      setLogs(data);
      setTotal(r.data.meta?.total ?? data.length);
    } catch (err) {
      setLogs([]);
      toast("error", apiErrorMessage(err, "Failed to load audit logs"));
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter, search, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    adminApi.auditLogFilterOptions()
      .then((r) => {
        setAllActions(r.data.data?.actions ?? []);
        setAllEntities(r.data.data?.entity_types ?? []);
      })
      .catch(() => {});
  }, []);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(value); setPage(1); }, 400);
  };

  const filtered = logs;
  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-6 max-w-5xl">
      <AdminPageHeader
        title="Audit Logs (staff activity)"
        titleBn="অডিট লগ (স্টাফ কার্যকলাপ)"
        description={`${total} total entries — who (which admin) did what (created, changed, deleted, logged in) and when. This is about staff actions, not technical errors (see System Events for that).`}
        descriptionBn={`${total}টি এন্ট্রি — কোন অ্যাডমিন কী করেছে (তৈরি, পরিবর্তন, মুছে ফেলা, লগইন) এবং কখন। এটি স্টাফ কার্যকলাপের লগ, কারিগরি সমস্যার নয় (সেটার জন্য System Events দেখুন)।`}
        actions={
          <div className="flex items-center gap-2 rounded-2xl bg-brand-50 px-3 py-2 text-brand-700">
            <ScrollText className="w-4 h-4" />
            <span className="text-sm font-semibold">{total} entries</span>
          </div>
        }
      />

      <AdminToolbar
        searchValue={searchInput}
        onSearchChange={handleSearchChange}
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
            <table className="table-premium table-responsive min-w-[500px]">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Record ID</th>
                  <th>Admin</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id}>
                    <td className="text-gray-500 text-xs whitespace-nowrap" data-label="Time">
                      {new Date(log.created_at).toLocaleString("en-BD", {
                        year: "numeric", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td data-label="Action">
                      <span className={`badge text-xs font-semibold ${actionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="text-gray-700 capitalize" data-label="Entity">{log.entity_type.replace(/_/g, " ")}</td>
                    <td data-label="Record ID">
                      {log.entity_id ? (
                        <span
                          className="text-xs text-gray-400 font-mono cursor-default"
                          title={log.entity_id}
                        >
                          {log.entity_id.slice(0, 8)}…
                        </span>
                      ) : "—"}
                    </td>
                    <td className="text-xs text-gray-500" data-label="Admin">{log.admin_email ?? "—"}</td>
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
