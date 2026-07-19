"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import AdminTitle from "@/components/admin/AdminTitle";
import { Loader2, Users, ChevronDown, X, Search, Download, Trash2 } from "lucide-react";
import { leadsApi, serviceLeadsAdminApi, downloadCsv, downloadPdf } from "@/lib/api";
import type { Lead, LeadV2 } from "@/types";
import { buildCustomerWhatsAppLink } from "@/lib/utils";
import StatusBadge from "@/components/admin/StatusBadge";
import { useToastStore } from "@/store/toast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import ComposeEmailModal from "@/components/admin/ComposeEmailModal";
import { useFocusTrap } from "@/lib/useFocusTrap";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminToolbar from "@/components/admin/AdminToolbar";

const STATUSES_V1 = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost"];
const STATUSES_V2 = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost", "archived"];
const TYPES_V1 = ["software_development", "ai_solutions", "automation", "erp", "general"];
const TYPES_V2 = ["software_development", "ai_solutions", "automation", "erp", "consulting", "support", "general"];

interface AdminLead extends Lead {
  created_at: string;
}

export default function AdminLeadsPage() {
  const [tab, setTab] = useState<"v1" | "v2">("v2");

  // V1 state
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminLead | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [exportPdfLoading, setExportPdfLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // V2 state
  const [leadsV2, setLeadsV2] = useState<LeadV2[]>([]);
  const [loadingV2, setLoadingV2] = useState(false);
  const [statusFilterV2, setStatusFilterV2] = useState("");
  const [typeFilterV2, setTypeFilterV2] = useState("");
  const [pageV2, setPageV2] = useState(1);
  const [totalV2, setTotalV2] = useState(0);
  const [updatingIdV2, setUpdatingIdV2] = useState<string | null>(null);
  const [detailV2, setDetailV2] = useState<LeadV2 | null>(null);
  const [composeEmail, setComposeEmail] = useState<{ to: string; subject: string; context: string } | null>(null);

  const toast = useToastStore((s) => s.push);
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const detailRef = useFocusTrap(!!detail || detailLoading, () => setDetail(null));
  const detailV2Ref = useFocusTrap(!!detailV2, () => setDetailV2(null));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await leadsApi.list({ lead_type: typeFilter || undefined, status: statusFilter || undefined, search: search || undefined, page });
      setLeads((r.data.data ?? []) as unknown as AdminLead[]);
      setTotal(r.data.meta?.total ?? 0);
    } catch (err) {
      toast("error", "Failed to load leads");
      console.error("Leads load error:", err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, search, page, toast]);

  const loadV2 = useCallback(async () => {
    setLoadingV2(true);
    try {
      const r = await serviceLeadsAdminApi.list({ status: statusFilterV2 || undefined, lead_type: typeFilterV2 || undefined, page: pageV2 });
      setLeadsV2(r.data.data ?? []);
      setTotalV2(r.data.meta?.total ?? 0);
    } catch (err) {
      toast("error", "Failed to load service leads");
      console.error("Service leads load error:", err);
    } finally {
      setLoadingV2(false);
    }
  }, [statusFilterV2, typeFilterV2, pageV2, toast]);

  useEffect(() => { if (tab === "v1") load(); }, [load, tab]);
  useEffect(() => { if (tab === "v2") loadV2(); }, [loadV2, tab]);

  const handleSearchChange = (v: string) => {
    setSearchInput(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1); }, 400);
  };

  const handleCsvExport = async () => {
    setCsvLoading(true);
    try {
      await downloadCsv("/api/v1/admin/bulk/export/leads", "service-leads.csv");
    } catch {
      toast("error", "CSV export failed");
    } finally {
      setCsvLoading(false);
    }
  };

  const handlePdfExport = async () => {
    setExportPdfLoading(true);
    try {
      await downloadPdf("/api/v1/admin/bulk/export/leads/pdf", "service-leads.pdf");
    } catch {
      toast("error", "PDF export failed");
    } finally {
      setExportPdfLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await leadsApi.updateStatus(id, status);
      await load();
      if (detail?.id === id) setDetail(prev => prev ? { ...prev, status: status as AdminLead["status"] } : prev);
    } finally {
      setUpdatingId(null);
    }
  };

  const updateStatusV2 = async (id: string, status: string) => {
    setUpdatingIdV2(id);
    try {
      await serviceLeadsAdminApi.updateStatus(id, status);
      await loadV2();
      if (detailV2?.id === id) setDetailV2(prev => prev ? { ...prev, status } : prev);
    } finally {
      setUpdatingIdV2(null);
    }
  };

  const handleDeleteV2 = (id: string, name: string) => {
    setConfirmState({
      title: `Delete lead "${name}"?`,
      message: "This action cannot be undone.",
      action: async () => {
        setConfirmState(null);
        setUpdatingIdV2(id);
        try {
          await serviceLeadsAdminApi.delete(id);
          setLeadsV2((prev) => prev.filter((l) => l.id !== id));
          setTotalV2((t) => t - 1);
          if (detailV2?.id === id) setDetailV2(null);
          toast("success", "Lead deleted");
        } catch {
          toast("error", "Delete failed");
        } finally {
          setUpdatingIdV2(null);
        }
      },
    });
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const r = await leadsApi.get(id);
      setDetail(r.data.data as unknown as AdminLead);
    } finally {
      setDetailLoading(false);
    }
  };

  const scoreColor = (score: number) =>
    score >= 80 ? "text-green-600 bg-green-50" :
    score >= 50 ? "text-yellow-600 bg-yellow-50" :
    "text-red-600 bg-red-50";

  return (
    <div className="space-y-6 max-w-6xl">
      <AdminPageHeader
        title="Leads"
        titleBn="লিড ব্যবস্থাপনা"
        description={`${tab === "v1" ? total : totalV2} total leads — qualification, follow-up, export, and lifecycle management`}
        descriptionBn={`${tab === "v1" ? total : totalV2}টি লিড — qualification, follow-up, export এবং lifecycle management`}
        actions={
          <div className="flex items-center gap-2 rounded-2xl bg-brand-50 px-3 py-2 text-brand-700">
            <Users className="w-4 h-4" />
            <span className="text-sm font-semibold">{tab === "v1" ? total : totalV2} leads</span>
          </div>
        }
      />

      {tab === "v1" ? (
        <AdminToolbar
          searchValue={searchInput}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search name, phone, company…"
        >
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="admin-input w-auto text-sm">
            <option value="">All Types</option>
            {TYPES_V1.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="admin-input w-auto text-sm">
            <option value="">All Status</option>
            {STATUSES_V1.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
          <button
            onClick={handleCsvExport}
            disabled={csvLoading}
            className="admin-btn-secondary !py-2 gap-1.5"
            title="Export all leads to CSV"
          >
            {csvLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            CSV
          </button>
          <button
            onClick={handlePdfExport}
            disabled={exportPdfLoading}
            className="admin-btn-secondary !py-2 gap-1.5"
            title="Export all leads as PDF"
          >
            {exportPdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            PDF
          </button>
        </AdminToolbar>
      ) : (
        <AdminToolbar>
          <select value={typeFilterV2} onChange={(e) => { setTypeFilterV2(e.target.value); setPageV2(1); }} className="admin-input w-auto text-sm">
            <option value="">All Types</option>
            {TYPES_V2.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
          <select value={statusFilterV2} onChange={(e) => { setStatusFilterV2(e.target.value); setPageV2(1); }} className="admin-input w-auto text-sm">
            <option value="">All Status</option>
            {STATUSES_V2.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </AdminToolbar>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab("v1")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "v1" ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Simple Leads
        </button>
        <button
          onClick={() => setTab("v2")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "v2" ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Service Leads
        </button>
      </div>

      {/* V1 Table */}
      {tab === "v1" && (
        <div className="admin-card overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No leads found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-premium min-w-[480px]">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th className="hidden sm:table-cell">Type</th>
                    <th className="hidden md:table-cell">Budget</th>
                    <th className="hidden md:table-cell">Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id} className="cursor-pointer" onClick={() => openDetail(l.id!)}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{l.name}</p>
                        <p className="text-xs text-gray-400">{l.phone}{l.company ? ` · ${l.company}` : ""}</p>
                        <p className="text-xs text-gray-400 sm:hidden capitalize">{l.lead_type.replace(/_/g, " ")}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-600 capitalize hidden sm:table-cell">{l.lead_type.replace(/_/g, " ")}</td>
                      <td className="px-5 py-3 text-gray-600 hidden md:table-cell">{l.budget_range ?? "—"}</td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">
                        {new Date(l.created_at).toLocaleDateString("en-BD")}
                      </td>
                      <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                        <div className="relative">
                          <select
                            value={l.status ?? "new"}
                            disabled={updatingId === l.id}
                            onChange={(e) => updateStatus(l.id!, e.target.value)}
                            className="appearance-none pl-2 pr-7 py-1 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-brand-500 cursor-pointer"
                          >
                            {STATUSES_V1.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                          </select>
                          <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* V2 Table */}
      {tab === "v2" && (
        <div className="admin-card overflow-hidden">
          {loadingV2 ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
          ) : leadsV2.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No service leads found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-premium min-w-[560px]">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th className="hidden sm:table-cell">Type</th>
                    <th className="hidden md:table-cell">Budget</th>
                    <th className="hidden sm:table-cell">Score</th>
                    <th className="hidden md:table-cell">Date</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {leadsV2.map((l) => (
                    <tr key={l.id} className="cursor-pointer" onClick={() => setDetailV2(l)}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{l.name}</p>
                        <p className="text-xs text-gray-400">{l.phone}{l.company ? ` · ${l.company}` : ""}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-600 capitalize hidden sm:table-cell">{l.lead_type.replace(/_/g, " ")}</td>
                      <td className="px-5 py-3 text-gray-600 text-sm hidden md:table-cell">
                        {l.budget_min != null || l.budget_max != null
                          ? `৳${(l.budget_min ?? 0).toLocaleString()}–${(l.budget_max ?? 0).toLocaleString()}`
                          : l.budget_range ?? "—"}
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${scoreColor(l.qualification_score)}`}>
                          {l.qualification_score}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">
                        {new Date(l.created_at).toLocaleDateString("en-BD")}
                      </td>
                      <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <select
                              value={l.status}
                              disabled={updatingIdV2 === l.id}
                              onChange={(e) => updateStatusV2(l.id, e.target.value)}
                              className="appearance-none pl-2 pr-7 py-1 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-brand-500 cursor-pointer"
                            >
                              {STATUSES_V2.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                            </select>
                            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                          <button
                            onClick={() => handleDeleteV2(l.id, l.name)}
                            disabled={updatingIdV2 === l.id}
                            title="Delete lead"
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {tab === "v1" && total > 20 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-outline btn-sm">Previous</button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {page}</span>
          <button disabled={leads.length < 20} onClick={() => setPage(p => p + 1)} className="btn btn-outline btn-sm">Next</button>
        </div>
      )}
      {tab === "v2" && totalV2 > 20 && (
        <div className="flex justify-center gap-2">
          <button disabled={pageV2 === 1} onClick={() => setPageV2(p => p - 1)} className="btn btn-outline btn-sm">Previous</button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {pageV2}</span>
          <button disabled={leadsV2.length < 20} onClick={() => setPageV2(p => p + 1)} className="btn btn-outline btn-sm">Next</button>
        </div>
      )}

      {/* V1 Lead Detail Modal */}
      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setDetail(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Lead details"
        >
          <div
            ref={detailRef}
            className="rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-scale-in"
            style={{ background: "rgba(255,255,255,0.98)", boxShadow: "0 24px 64px rgba(30,91,168,0.16), 0 8px 24px rgba(0,0,0,0.08)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {detail ? `Lead — ${detail.name}` : "Loading..."}
              </h2>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {detailLoading ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
            ) : detail ? (
              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
                <div className="flex items-center justify-between">
                  <StatusBadge status={detail.status ?? "new"} />
                  <select
                    value={detail.status ?? "new"}
                    disabled={updatingId === detail.id}
                    onChange={(e) => updateStatus(detail.id!, e.target.value)}
                    className="input w-auto text-sm"
                  >
                    {STATUSES_V1.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm">Contact Info</h3>
                    <div className="flex gap-2">
                      {detail.phone && <a href={`tel:${detail.phone}`} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg hover:bg-green-100 transition-colors font-medium">📞 Call</a>}
                      {detail.phone && <a href={buildCustomerWhatsAppLink(detail.phone, `Hello ${detail.name}, thank you for your inquiry at ABO Enterprise. How can we help you?`)} target="_blank" rel="noopener noreferrer" className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg hover:bg-green-100 transition-colors font-medium">💬 WhatsApp</a>}
                      {detail.email && <button type="button" onClick={() => setComposeEmail({ to: detail.email!, subject: "Regarding your inquiry at ABO Enterprise", context: `Lead — ${detail.name}` })} title="Compose and send an email to the customer from no-reply@aboenterprise.com" className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors font-medium">✉ Email</button>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-gray-500 text-xs">Name</p><p className="font-medium">{detail.name}</p></div>
                    <div><p className="text-gray-500 text-xs">Phone</p><p className="font-medium">{detail.phone}</p></div>
                    {detail.email && <div><p className="text-gray-500 text-xs">Email</p><p className="font-medium">{detail.email}</p></div>}
                    {detail.company && <div><p className="text-gray-500 text-xs">Company</p><p className="font-medium">{detail.company}</p></div>}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 text-sm mb-3">Project Info</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-gray-500 text-xs">Type</p><p className="font-medium capitalize">{detail.lead_type.replace(/_/g, " ")}</p></div>
                    {detail.budget_range && <div><p className="text-gray-500 text-xs">Budget</p><p className="font-medium">{detail.budget_range}</p></div>}
                    <div><p className="text-gray-500 text-xs">Date</p><p className="font-medium">{new Date(detail.created_at).toLocaleDateString("en-BD")}</p></div>
                  </div>
                  {detail.project_description && (
                    <div className="pt-3 border-t border-gray-200 mt-3">
                      <p className="text-gray-500 text-xs mb-1">Description</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{detail.project_description}</p>
                    </div>
                  )}
                  {detail.requirements && (
                    <div className="pt-3 border-t border-gray-200 mt-3">
                      <p className="text-gray-500 text-xs mb-1">Requirements</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{detail.requirements}</p>
                    </div>
                  )}
                  {(detail as { reason_lost?: string }).reason_lost && (
                    <div className="pt-3 border-t border-red-100 mt-3">
                      <p className="text-red-500 text-xs mb-1 font-medium">Reason Lost</p>
                      <p className="text-sm text-red-800 bg-red-50 rounded-lg px-3 py-2 whitespace-pre-wrap">{(detail as { reason_lost?: string }).reason_lost}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* V2 Lead Detail Modal */}
      {detailV2 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setDetailV2(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Service lead details"
        >
          <div
            ref={detailV2Ref}
            className="rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-scale-in"
            style={{ background: "rgba(255,255,255,0.98)", boxShadow: "0 24px 64px rgba(30,91,168,0.16), 0 8px 24px rgba(0,0,0,0.08)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Lead {detailV2.lead_number}</h2>
              <button onClick={() => setDetailV2(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge status={detailV2.status} />
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${scoreColor(detailV2.qualification_score)}`}>
                    Score: {detailV2.qualification_score}
                  </span>
                </div>
                <select
                  value={detailV2.status}
                  disabled={updatingIdV2 === detailV2.id}
                  onChange={(e) => updateStatusV2(detailV2.id, e.target.value)}
                  className="input w-auto text-sm"
                >
                  {STATUSES_V2.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">Contact</h3>
                  <div className="flex gap-2">
                    {detailV2.phone && <a href={`tel:${detailV2.phone}`} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg hover:bg-green-100 transition-colors font-medium">📞 Call</a>}
                    {detailV2.phone && <a href={buildCustomerWhatsAppLink(detailV2.phone, `Hello ${detailV2.name}, thank you for your inquiry ${detailV2.lead_number} at ABO Enterprise. How can we help you?`)} target="_blank" rel="noopener noreferrer" className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg hover:bg-green-100 transition-colors font-medium">💬 WhatsApp</a>}
                    {detailV2.email && <button type="button" onClick={() => setComposeEmail({ to: detailV2.email!, subject: `Regarding your inquiry ${detailV2.lead_number}`, context: `Lead ${detailV2.lead_number}` })} title="Compose and send an email to the customer from no-reply@aboenterprise.com" className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors font-medium">✉ Email</button>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500 text-xs">Name</p><p className="font-medium">{detailV2.name}</p></div>
                  <div><p className="text-gray-500 text-xs">Phone</p><p className="font-medium">{detailV2.phone}</p></div>
                  {detailV2.email && <div><p className="text-gray-500 text-xs">Email</p><p className="font-medium">{detailV2.email}</p></div>}
                  {detailV2.company && <div><p className="text-gray-500 text-xs">Company</p><p className="font-medium">{detailV2.company}</p></div>}
                  {detailV2.job_title && <div><p className="text-gray-500 text-xs">Job Title</p><p className="font-medium">{detailV2.job_title}</p></div>}
                  {detailV2.company_size && <div><p className="text-gray-500 text-xs">Company Size</p><p className="font-medium">{detailV2.company_size}</p></div>}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 text-sm mb-3">Project</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500 text-xs">Type</p><p className="font-medium capitalize">{detailV2.lead_type.replace(/_/g, " ")}</p></div>
                  <div><p className="text-gray-500 text-xs">Source</p><p className="font-medium capitalize">{detailV2.source}</p></div>
                  {(detailV2.budget_min != null || detailV2.budget_max != null) && (
                    <div>
                      <p className="text-gray-500 text-xs">Budget</p>
                      <p className="font-medium">৳{(detailV2.budget_min ?? 0).toLocaleString()}–{(detailV2.budget_max ?? 0).toLocaleString()}</p>
                    </div>
                  )}
                  {detailV2.timeline && <div><p className="text-gray-500 text-xs">Timeline</p><p className="font-medium">{detailV2.timeline}</p></div>}
                  <div><p className="text-gray-500 text-xs">Created</p><p className="font-medium">{new Date(detailV2.created_at).toLocaleDateString("en-BD")}</p></div>
                  {detailV2.converted_at && <div><p className="text-gray-500 text-xs">Converted</p><p className="font-medium">{new Date(detailV2.converted_at).toLocaleDateString("en-BD")}</p></div>}
                </div>
                {detailV2.project_description && (
                  <div className="pt-3 border-t border-gray-200 mt-3">
                    <p className="text-gray-500 text-xs mb-1">Description</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{detailV2.project_description}</p>
                  </div>
                )}
                {detailV2.requirements && (
                  <div className="pt-3 border-t border-gray-200 mt-3">
                    <p className="text-gray-500 text-xs mb-1">Requirements</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{detailV2.requirements}</p>
                  </div>
                )}
                {(detailV2 as unknown as { reason_lost?: string }).reason_lost && (
                  <div className="pt-3 border-t border-red-100 mt-3">
                    <p className="text-red-500 text-xs mb-1 font-medium">Reason Lost</p>
                    <p className="text-sm text-red-800 bg-red-50 rounded-lg px-3 py-2 whitespace-pre-wrap">{(detailV2 as unknown as { reason_lost?: string }).reason_lost}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title ?? ""}
        message={confirmState?.message ?? ""}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => confirmState?.action()}
        onCancel={() => setConfirmState(null)}
      />

      <ComposeEmailModal
        open={!!composeEmail}
        onClose={() => setComposeEmail(null)}
        to={composeEmail?.to ?? ""}
        defaultSubject={composeEmail?.subject ?? ""}
        contextLabel={composeEmail?.context}
      />
    </div>
  );
}
