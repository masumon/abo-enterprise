"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { adminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import { Loader2, History, X, Copy } from "lucide-react";
import { ADMIN_MODAL_BACKDROP_STYLE, ADMIN_MODAL_PANEL_STYLE } from "@/lib/adminModalStyles";
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
  // Clicked event → full message + details (the table row truncates long messages).
  const [detail, setDetail] = useState<SystemEventRow | null>(null);
  const copyDetail = async (e: SystemEventRow) => {
    const text = `${e.created_at}  [${e.severity}] ${e.event_type} (${e.source})

${e.message}${e.meta && Object.keys(e.meta).length ? `

${JSON.stringify(e.meta, null, 2)}` : ""}`;
    try { await navigator.clipboard.writeText(text); toast("success", "কপি হয়েছে"); }
    catch { toast("error", "কপি করা যায়নি"); }
  };

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
      toast("error", apiErrorMessage(err, "সিস্টেমের ঘটনা আনা যায়নি"));
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
    <div className="admin-page space-y-5">
      <AdminPageHeader
        title="System Events (technical problems)"
        titleBn="সিস্টেম ইভেন্ট (কারিগরি সমস্যা)"
        description={`${total} total — failed logins, failed emails, and runtime errors. This is about what went wrong technically, not what a staff member did (see Audit Logs for that).`}
        descriptionBn={`${total}টি — ব্যর্থ লগইন, ব্যর্থ ইমেইল এবং রানটাইম এরর। এটি কারিগরি সমস্যার লগ, স্টাফ কী করেছে তার নয় (সেটার জন্য Audit Logs দেখুন)।`}
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
        <div className="admin-card overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
          <div className="space-y-3 p-3 min-[641px]:hidden">
            {events.map((e) => (
              <article key={e.id} role="button" tabIndex={0} onClick={() => setDetail(e)} onKeyDown={(k) => { if (k.key === "Enter" || k.key === " ") { k.preventDefault(); setDetail(e); } }} className="cursor-pointer rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:border-brand-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">
                <div className="flex flex-wrap items-start justify-between gap-2"><span className={`badge text-xs font-semibold ${SEVERITY_STYLE[e.severity] ?? SEVERITY_STYLE.info}`}>{e.severity}</span><time className="text-right text-xs text-gray-500">{new Date(e.created_at).toLocaleString("en-BD", {year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</time></div>
                <p className="mt-3 break-words text-sm font-semibold capitalize text-gray-900">{e.event_type.replace(/_/g, " ")}</p>
                <p className="mt-1 break-words text-xs text-gray-500">Source: {e.source}</p>
                <p className="mt-3 line-clamp-4 whitespace-pre-wrap break-words border-t border-gray-100 pt-3 text-sm text-gray-700">{e.message}</p>
                <p className="mt-2 text-xs font-semibold text-brand-600">বিস্তারিত দেখুন →</p>
              </article>
            ))}
          </div>
          <div className="hidden min-[641px]:block overflow-x-auto">
            <table className="table-premium table-responsive min-[641px]:min-w-0 min-[641px]:min-w-[600px] min-w-0 min-[641px]:min-w-[600px]">
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
                  <tr key={e.id} tabIndex={0} onClick={() => setDetail(e)} onKeyDown={(k) => { if (k.key === "Enter") setDetail(e); }} className="cursor-pointer hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400" title="ক্লিক করে পুরো বার্তা দেখুন">
                    <td className="text-gray-500 text-xs whitespace-nowrap" data-label="Time">
                      {new Date(e.created_at).toLocaleString("en-BD", {
                        year: "numeric", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td data-label="Severity">
                      <span className={`badge text-xs font-semibold ${SEVERITY_STYLE[e.severity] ?? SEVERITY_STYLE.info}`}>
                        {e.severity}
                      </span>
                    </td>
                    <td className="text-gray-700" data-label="Type">{e.event_type.replace(/_/g, " ")}</td>
                    <td className="text-xs text-gray-500" data-label="Source">{e.source}</td>
                    <td className="text-sm text-gray-700 max-w-md truncate" data-label="Message">{e.message}</td>
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

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={ADMIN_MODAL_BACKDROP_STYLE}
          onClick={() => setDetail(null)} onKeyDown={(k) => { if (k.key === "Escape") setDetail(null); }}
          role="dialog" aria-modal="true" aria-label="ঘটনার বিস্তারিত">
          <div className="rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in" style={ADMIN_MODAL_PANEL_STYLE} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-100">
              <div className="min-w-0">
                <span className={`badge text-xs font-semibold ${SEVERITY_STYLE[detail.severity] ?? SEVERITY_STYLE.info}`}>{detail.severity}</span>
                <h2 className="mt-2 text-lg font-semibold text-gray-900 break-words capitalize">{detail.event_type.replace(/_/g, " ")}</h2>
                <p className="mt-0.5 text-xs text-gray-500 break-words">
                  {new Date(detail.created_at).toLocaleString("bn-BD", { timeZone: "Asia/Dhaka", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })} · উৎস: {detail.source}
                </p>
              </div>
              <button type="button" onClick={() => setDetail(null)} aria-label="বন্ধ করুন" autoFocus className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">পুরো বার্তা</p>
                <p className="whitespace-pre-wrap break-words text-sm text-gray-800 rounded-xl bg-gray-50 p-3">{detail.message}</p>
              </div>
              {detail.meta && Object.keys(detail.meta).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">বিস্তারিত তথ্য</p>
                  <pre className="whitespace-pre-wrap break-all text-xs text-gray-700 rounded-xl bg-gray-50 p-3 font-mono">{JSON.stringify(detail.meta, null, 2)}</pre>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 sm:px-6 py-3 border-t border-gray-100">
              <button type="button" onClick={() => copyDetail(detail)} className="btn btn-outline btn-sm min-h-11 gap-1.5"><Copy className="w-4 h-4" aria-hidden /> কপি করুন</button>
              <button type="button" onClick={() => setDetail(null)} className="btn btn-primary btn-sm min-h-11">বন্ধ করুন</button>
            </div>
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
    </div>
  );
}
