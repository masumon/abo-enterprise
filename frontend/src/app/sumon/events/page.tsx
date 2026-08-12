"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { adminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import { Loader2, History } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminToolbar from "@/components/admin/AdminToolbar";

interface SystemEventRow {
  id: string;
  event_type: string;
  severity: string;
  source: string;
  message: string;
  meta: Record<string, unknown>;
  created_at: string;
}

const SEVERITY_STYLE: Record<string, string> = {
  error: "bg-red-50 text-red-700",
  warning: "bg-amber-50 text-amber-700",
  info: "bg-brand-50 text-brand-700",
};

export default function AdminSystemEventsPage() {
  const toast = useToastStore((s) => s.push);
  const [events, setEvents] = useState<SystemEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [allTypes, setAllTypes] = useState<string[]>([]);
  const PER_PAGE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.listSystemEvents({
        page, per_page: PER_PAGE,
        event_type: typeFilter || undefined,
        severity: severityFilter || undefined,
        search: search || undefined,
      });
      const data = r.data.data ?? [];
      setEvents(data);
      setTotal(r.data.meta?.total ?? data.length);
    } catch (err) {
      setEvents([]);
      toast("error", apiErrorMessage(err, "Failed to load system events"));
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, severityFilter, search, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    adminApi.systemEventFilterOptions()
      .then((r) => setAllTypes(r.data.data?.event_types ?? []))
      .catch(() => {});
  }, []);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(value); setPage(1); }, 400);
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-6 max-w-5xl">
      <AdminPageHeader
        title="System Events"
        titleBn="সিস্টেম ইভেন্ট"
        description={`${total} total — persistent log of failed logins, failed emails, and runtime errors (survives restarts)`}
        descriptionBn={`${total}টি — ব্যর্থ লগইন, ব্যর্থ ইমেইল এবং রানটাইম এরর-এর স্থায়ী লগ`}
        actions={
          <div className="flex items-center gap-2 rounded-2xl bg-brand-50 px-3 py-2 text-brand-700">
            <History className="w-4 h-4" />
            <span className="text-sm font-semibold">{total} events</span>
          </div>
        }
      />

      <AdminToolbar
        searchValue={searchInput}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search event messages…"
      >
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          aria-label="Filter by event type"
          className="admin-input text-sm w-auto"
        >
          <option value="">All Types</option>
          {allTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
          aria-label="Filter by severity"
          className="admin-input text-sm w-auto"
        >
          <option value="">All Severities</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </AdminToolbar>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-premium min-w-[600px]">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Severity</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td className="text-gray-500 text-xs whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString("en-BD", {
                        year: "numeric", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td>
                      <span className={`badge text-xs font-semibold ${SEVERITY_STYLE[e.severity] ?? SEVERITY_STYLE.info}`}>
                        {e.severity}
                      </span>
                    </td>
                    <td className="text-gray-700">{e.event_type.replace(/_/g, " ")}</td>
                    <td className="text-xs text-gray-500">{e.source}</td>
                    <td className="text-sm text-gray-700 max-w-md truncate" title={e.message}>{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {events.length === 0 && (
            <p className="p-8 text-center text-gray-500">{search || typeFilter || severityFilter ? "No events match your filter" : "No system events recorded yet"}</p>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn btn-outline btn-sm">Previous</button>
          <span className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50 rounded-lg border border-gray-200">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn btn-outline btn-sm">Next</button>
        </div>
      )}
    </div>
  );
}
