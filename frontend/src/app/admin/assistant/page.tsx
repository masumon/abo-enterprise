"use client";

import { useCallback, useEffect, useState } from "react";
import AdminTitle from "@/components/admin/AdminTitle";
import {
  Bot, Loader2, Save, RefreshCw, Check, Trash2, Plus, Pencil, X,
  MessageSquare, Zap, BookOpen, Settings2, Eye, Search, Link2, Database,
} from "lucide-react";
import {
  assistantAdminApi,
  ASSISTANT_DEFAULT_CONFIG,
  type AssistantAdminConfig,
  type AssistantFaqEntry,
  type AssistantConversation,
  type AssistantActionLog,
} from "@/lib/api";
import { useToastStore } from "@/store/toast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import StatusBadge from "@/components/admin/StatusBadge";

type Tab = "settings" | "conversations" | "logs" | "faq";

const EMPTY_FAQ = { key: "", topic: "", answer_en: "", answer_bn: "", questions: "" };

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start justify-between gap-4 py-3 cursor-pointer">
      <div className="min-w-0">
        <span className="text-sm text-gray-700 block">{label}</span>
        {hint && <span className="text-xs text-gray-400 mt-0.5 block">{hint}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${checked ? "bg-brand-600" : "bg-gray-300"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
      </button>
    </label>
  );
}

const INTEGRATIONS = [
  { label: "Products", table: "products", desc: "Search, price, stock, categories" },
  { label: "Services", table: "services", desc: "Info, pricing tiers, booking" },
  { label: "Orders", table: "orders + order_items", desc: "Place order, track, invoice" },
  { label: "Bookings", table: "bookings_v2", desc: "Service booking + status" },
  { label: "Leads", table: "leads_v2", desc: "Inquiry / quote submission" },
  { label: "Settings", table: "settings", desc: "Delivery charges, welcome, flags" },
  { label: "FAQ", table: "assistant_faq_knowledge", desc: "Admin-editable Q&A" },
  { label: "Coupons", table: "coupons_json", desc: "Validate & list coupons" },
  { label: "Blog", table: "blog_posts", desc: "Search & recent posts" },
  { label: "Conversations", table: "assistant_conversations", desc: "Session history & logs" },
];

export default function AdminAssistantPage() {
  const [tab, setTab] = useState<Tab>("settings");
  const toast = useToastStore((s) => s.push);
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; action: () => void } | null>(null);

  // Settings
  const [config, setConfig] = useState<AssistantAdminConfig>({ ...ASSISTANT_DEFAULT_CONFIG });
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  // Conversations
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const [convPage, setConvPage] = useState(1);
  const [convTotal, setConvTotal] = useState(0);
  const [convSearch, setConvSearch] = useState("");
  const [convDetail, setConvDetail] = useState<{
    conversation: AssistantConversation;
    messages: { role: string; content: string; intent?: string }[];
  } | null>(null);
  const [convDetailLoading, setConvDetailLoading] = useState(false);
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);

  // Logs
  const [logs, setLogs] = useState<AssistantActionLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  // FAQ
  const [faqList, setFaqList] = useState<AssistantFaqEntry[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqEditing, setFaqEditing] = useState<AssistantFaqEntry | null>(null);
  const [faqIsNew, setFaqIsNew] = useState(false);
  const [faqSaving, setFaqSaving] = useState(false);
  const [deletingFaqKey, setDeletingFaqKey] = useState<string | null>(null);
  const [faqSearch, setFaqSearch] = useState("");

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const r = await assistantAdminApi.getConfig();
      if (r.data.data) setConfig({ ...ASSISTANT_DEFAULT_CONFIG, ...r.data.data });
    } catch {
      toast("error", "Failed to load assistant settings");
    } finally {
      setConfigLoading(false);
    }
  }, [toast]);

  const loadConversations = useCallback(async () => {
    setConvLoading(true);
    try {
      const r = await assistantAdminApi.listConversations({ page: convPage, per_page: 20, search: convSearch || undefined });
      setConversations(r.data.data ?? []);
      setConvTotal(r.data.meta?.total ?? 0);
    } catch {
      toast("error", "Failed to load conversations");
    } finally {
      setConvLoading(false);
    }
  }, [convPage, convSearch, toast]);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const r = await assistantAdminApi.listLogs({ page: logsPage, per_page: 20 });
      setLogs(r.data.data ?? []);
      setLogsTotal(r.data.meta?.total ?? 0);
    } catch {
      toast("error", "Failed to load automation logs");
    } finally {
      setLogsLoading(false);
    }
  }, [logsPage, toast]);

  const loadFaq = useCallback(async () => {
    setFaqLoading(true);
    try {
      const r = await assistantAdminApi.listFaq();
      setFaqList(r.data.data ?? []);
    } catch {
      toast("error", "Failed to load FAQ knowledge");
    } finally {
      setFaqLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { if (tab === "conversations") loadConversations(); }, [tab, loadConversations]);
  useEffect(() => { if (tab === "logs") loadLogs(); }, [tab, loadLogs]);
  useEffect(() => { if (tab === "faq") loadFaq(); }, [tab, loadFaq]);

  const saveConfig = async () => {
    setConfigSaving(true);
    try {
      await assistantAdminApi.updateConfig(config);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2500);
      toast("success", "Assistant settings saved");
    } catch {
      toast("error", "Failed to save settings");
    } finally {
      setConfigSaving(false);
    }
  };

  const viewConversation = async (id: string) => {
    setConvDetailLoading(true);
    try {
      const r = await assistantAdminApi.getConversation(id);
      setConvDetail(r.data.data ?? null);
    } catch {
      toast("error", "Failed to load conversation");
    } finally {
      setConvDetailLoading(false);
    }
  };

  const deleteConversation = (id: string) => {
    setConfirmState({
      title: "Delete this conversation?",
      message: "All messages in this conversation will be permanently removed.",
      action: async () => {
        setConfirmState(null);
        setDeletingConvId(id);
        try {
          await assistantAdminApi.deleteConversation(id);
          toast("success", "Conversation deleted");
          if (convDetail?.conversation.id === id) setConvDetail(null);
          await loadConversations();
        } catch {
          toast("error", "Failed to delete conversation");
        } finally {
          setDeletingConvId(null);
        }
      },
    });
  };

  const deleteLog = (id: string) => {
    setConfirmState({
      title: "Delete this automation log?",
      message: "This log entry will be permanently removed.",
      action: async () => {
        setConfirmState(null);
        setDeletingLogId(id);
        try {
          await assistantAdminApi.deleteLog(id);
          toast("success", "Log deleted");
          await loadLogs();
        } catch {
          toast("error", "Failed to delete log");
        } finally {
          setDeletingLogId(null);
        }
      },
    });
  };

  const openNewFaq = () => {
    setFaqEditing({ ...EMPTY_FAQ });
    setFaqIsNew(true);
  };

  const openEditFaq = (entry: AssistantFaqEntry) => {
    setFaqEditing({ ...entry });
    setFaqIsNew(false);
  };

  const saveFaq = async () => {
    if (!faqEditing) return;
    if (!faqEditing.key.trim()) { toast("error", "FAQ key is required"); return; }
    if (!faqEditing.answer_en.trim()) { toast("error", "English answer is required"); return; }

    setFaqSaving(true);
    try {
      if (faqIsNew) {
        await assistantAdminApi.createFaq({
          key: faqEditing.key,
          answer_en: faqEditing.answer_en,
          answer_bn: faqEditing.answer_bn || undefined,
          questions: faqEditing.questions || undefined,
        });
        toast("success", "FAQ entry created");
      } else {
        await assistantAdminApi.updateFaq(faqEditing.key, {
          answer_en: faqEditing.answer_en,
          answer_bn: faqEditing.answer_bn,
          questions: faqEditing.questions ?? "",
        });
        toast("success", "FAQ entry updated");
      }
      setFaqEditing(null);
      await loadFaq();
    } catch {
      toast("error", faqIsNew ? "Failed to create FAQ" : "Failed to update FAQ");
    } finally {
      setFaqSaving(false);
    }
  };

  const deleteFaq = (key: string) => {
    setConfirmState({
      title: `Delete FAQ "${key}"?`,
      message: "This FAQ entry will be permanently removed from the assistant's knowledge base.",
      action: async () => {
        setConfirmState(null);
        setDeletingFaqKey(key);
        try {
          await assistantAdminApi.deleteFaq(key);
          toast("success", "FAQ deleted");
          await loadFaq();
        } catch {
          toast("error", "Failed to delete FAQ");
        } finally {
          setDeletingFaqKey(null);
        }
      },
    });
  };

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "settings", label: "Settings", icon: Settings2 },
    { id: "conversations", label: "Conversations", icon: MessageSquare },
    { id: "logs", label: "Automation Logs", icon: Zap },
    { id: "faq", label: "FAQ Knowledge", icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-7 h-7 text-brand-600" />
            <AdminTitle en="AI Assistant" bn="AI সহকারী" />
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Manage automation assistant, WhatsApp integration, conversations and knowledge base
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              tab === id
                ? "bg-brand-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {tab === "settings" && (
        <div className="space-y-6 max-w-3xl">
          {/* Integration overview */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-brand-600" />
              <h2 className="text-sm font-semibold text-gray-800">Admin ↔ Assistant Integration</h2>
            </div>
            <div className="p-6 grid sm:grid-cols-2 gap-3">
              {INTEGRATIONS.map((item) => (
                <div key={item.table} className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <Database className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    <p className="text-xs font-mono text-gray-400">{item.table}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="px-6 pb-4 text-xs text-gray-500">
              Assistant reads live data from these sources. Toggle features below to enable/disable each capability without code changes.
            </p>
          </div>

          {configLoading ? (
            <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-sm font-semibold text-gray-800">Feature Controls</h2>
                <button
                  onClick={saveConfig}
                  disabled={configSaving}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    configSaved ? "bg-green-500 text-white" : "bg-brand-600 text-white hover:bg-brand-700"
                  } disabled:opacity-60`}
                >
                  {configSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : configSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  {configSaving ? "Saving…" : configSaved ? "Saved!" : "Save"}
                </button>
              </div>

              <div className="px-6 py-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-3 pb-1">General</p>
                <div className="divide-y divide-gray-50">
                  <Toggle
                    label="Enable Assistant Chat Widget (site-wide)"
                    hint="Master switch — hides the floating assistant when off"
                    checked={config.feature_assistant_chat}
                    onChange={(v) => setConfig((c) => ({ ...c, feature_assistant_chat: v }))}
                  />
                  <Toggle
                    label="WhatsApp option inside Assistant"
                    checked={config.feature_assistant_whatsapp}
                    onChange={(v) => setConfig((c) => ({ ...c, feature_assistant_whatsapp: v }))}
                  />
                </div>

                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-5 pb-1">Automation (DB writes)</p>
                <div className="divide-y divide-gray-50">
                  <Toggle label="Place orders via chat" hint="Multi-step order → orders table" checked={config.assistant_feature_orders} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_orders: v }))} />
                  <Toggle label="Book services via chat" hint="Multi-step booking → bookings_v2" checked={config.assistant_feature_bookings} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_bookings: v }))} />
                  <Toggle label="Submit leads / quotes" hint="Inquiry → leads_v2" checked={config.assistant_feature_leads} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_leads: v }))} />
                  <Toggle label="Customer complaints → admin notify" checked={config.assistant_feature_complaints} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_complaints: v }))} />
                </div>

                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-5 pb-1">Tracking (DB reads)</p>
                <div className="divide-y divide-gray-50">
                  <Toggle label="Order tracking" hint="By order number or phone" checked={config.assistant_feature_order_tracking} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_order_tracking: v }))} />
                  <Toggle label="Booking tracking" hint="By BK- number or phone" checked={config.assistant_feature_booking_tracking} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_booking_tracking: v }))} />
                  <Toggle label="Lead / inquiry tracking" hint="By LF- number or phone" checked={config.assistant_feature_lead_tracking} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_lead_tracking: v }))} />
                </div>

                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-5 pb-1">Catalog & Knowledge</p>
                <div className="divide-y divide-gray-50">
                  <Toggle label="Product search & details" checked={config.assistant_feature_product_search} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_product_search: v }))} />
                  <Toggle label="Service info & pricing" checked={config.assistant_feature_service_info} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_service_info: v }))} />
                  <Toggle label="Coupons" checked={config.assistant_feature_coupons} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_coupons: v }))} />
                  <Toggle label="Invoice help" checked={config.assistant_feature_invoices} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_invoices: v }))} />
                  <Toggle label="Delivery info & charges" checked={config.assistant_feature_delivery_info} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_delivery_info: v }))} />
                  <Toggle label="FAQ answers" hint="Uses FAQ tab + admin settings" checked={config.assistant_feature_faq} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_faq: v }))} />
                  <Toggle label="Blog posts" checked={config.assistant_feature_blog} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_blog: v }))} />
                  <Toggle label="Web search fallback" hint="DuckDuckGo when DB has no match" checked={config.assistant_feature_web_search} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_web_search: v }))} />
                </div>

                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-5 pb-1">Messages</p>
                <div className="py-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">WhatsApp Number</label>
                    <input type="tel" value={config.whatsapp_number} onChange={(e) => setConfig((c) => ({ ...c, whatsapp_number: e.target.value }))} placeholder="8801825007977" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Welcome Message (English)</label>
                    <textarea value={config.assistant_welcome_en} onChange={(e) => setConfig((c) => ({ ...c, assistant_welcome_en: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Welcome Message (বাংলা)</label>
                    <textarea value={config.assistant_welcome_bn} onChange={(e) => setConfig((c) => ({ ...c, assistant_welcome_bn: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conversations Tab */}
      {tab === "conversations" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadConversations()}
              placeholder="Search by session, name or phone…"
              className="flex-1 max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <button onClick={loadConversations} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
              <RefreshCw className={`w-4 h-4 ${convLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {convLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
            ) : conversations.length === 0 ? (
              <p className="text-center text-gray-500 py-16 text-sm">No conversations yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Session</th>
                      <th className="text-left px-4 py-3">Customer</th>
                      <th className="text-left px-4 py-3">Intent</th>
                      <th className="text-left px-4 py-3">Messages</th>
                      <th className="text-left px-4 py-3">Updated</th>
                      <th className="text-right px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {conversations.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-mono text-xs">{c.session_id.slice(0, 12)}…</td>
                        <td className="px-4 py-3">
                          <div>{c.customer_name || "—"}</div>
                          <div className="text-xs text-gray-400">{c.customer_phone || ""}</div>
                        </td>
                        <td className="px-4 py-3">{c.last_intent ? <StatusBadge status={c.last_intent} /> : "—"}</td>
                        <td className="px-4 py-3">{c.message_count}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(c.updated_at).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => viewConversation(c.id)} className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600" title="View">
                              <span className="sr-only">View conversation</span>
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteConversation(c.id)}
                              disabled={deletingConvId === c.id}
                              aria-label="Delete conversation"
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                              title="Delete"
                            >
                              {deletingConvId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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

          {convTotal > 20 && (
            <div className="flex justify-center gap-2">
              <button disabled={convPage <= 1} onClick={() => setConvPage((p) => p - 1)} className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40">Prev</button>
              <span className="text-sm text-gray-500 py-1">Page {convPage}</span>
              <button disabled={convPage * 20 >= convTotal} onClick={() => setConvPage((p) => p + 1)} className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40">Next</button>
            </div>
          )}

          {(convDetail || convDetailLoading) && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
              onClick={() => setConvDetail(null)}
              role="dialog"
              aria-modal="true"
              aria-label="Conversation detail"
            >
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b">
                  <h3 className="font-semibold">Conversation Detail</h3>
                  <button onClick={() => setConvDetail(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {convDetailLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
                  ) : convDetail?.messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                        m.role === "user" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-800"
                      }`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Automation Logs Tab */}
      {tab === "logs" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={loadLogs} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
              <RefreshCw className={`w-4 h-4 ${logsLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {logsLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
            ) : logs.length === 0 ? (
              <p className="text-center text-gray-500 py-16 text-sm">No automation logs yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Action</th>
                      <th className="text-left px-4 py-3">Intent</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Session</th>
                      <th className="text-left px-4 py-3">Time</th>
                      <th className="text-right px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium">{log.action}</td>
                        <td className="px-4 py-3">{log.intent || "—"}</td>
                        <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                        <td className="px-4 py-3 font-mono text-xs">{log.session_id?.slice(0, 10) || "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => deleteLog(log.id)}
                            disabled={deletingLogId === log.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                          >
                            {deletingLogId === log.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {logsTotal > 20 && (
            <div className="flex justify-center gap-2">
              <button disabled={logsPage <= 1} onClick={() => setLogsPage((p) => p - 1)} className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40">Prev</button>
              <span className="text-sm text-gray-500 py-1">Page {logsPage}</span>
              <button disabled={logsPage * 20 >= logsTotal} onClick={() => setLogsPage((p) => p + 1)} className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}

      {/* FAQ Tab */}
      {tab === "faq" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                placeholder="Search FAQ entries…"
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
              />
            </div>
            <p className="text-sm text-gray-500">{faqList.length} entries</p>
            <button onClick={openNewFaq} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
              <Plus className="w-4 h-4" /> Add FAQ
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {faqLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
            ) : faqList.length === 0 ? (
              <p className="text-center text-gray-500 py-16 text-sm">No FAQ entries. Add your first one.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {faqList.filter((entry) => {
                  if (!faqSearch.trim()) return true;
                  const q = faqSearch.toLowerCase();
                  return entry.key.toLowerCase().includes(q) || entry.answer_en.toLowerCase().includes(q) || (entry.topic ?? "").toLowerCase().includes(q) || (entry.questions ?? "").toLowerCase().includes(q);
                }).map((entry) => (
                  <div key={entry.key} className="px-6 py-4 hover:bg-gray-50/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{entry.key}</span>
                          <span className="text-sm font-semibold text-gray-800">{entry.topic}</span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{entry.answer_en}</p>
                        {entry.answer_bn && (
                          <p className="text-sm text-gray-400 line-clamp-1 mt-1">{entry.answer_bn}</p>
                        )}
                        {entry.questions?.trim() && (
                          <p className="text-[11px] text-brand-500 mt-1">
                            {entry.questions.split("\n").filter(Boolean).length} trigger question(s)
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => openEditFaq(entry)} className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600">
                          <span className="sr-only">Edit FAQ entry {entry.key}</span>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteFaq(entry.key)}
                          disabled={deletingFaqKey === entry.key}
                          aria-label={`Delete FAQ entry ${entry.key}`}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                        >
                          {deletingFaqKey === entry.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {faqEditing && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
              onClick={() => setFaqEditing(null)}
              role="dialog"
              aria-modal="true"
              aria-label={faqIsNew ? "Add FAQ entry" : "Edit FAQ entry"}
            >
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b">
                  <h3 className="font-semibold">{faqIsNew ? "Add FAQ Entry" : `Edit: ${faqEditing.key}`}</h3>
                  <button onClick={() => setFaqEditing(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5 space-y-4">
                  {faqIsNew && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Key (e.g. delivery, warranty)</label>
                      <input
                        value={faqEditing.key}
                        onChange={(e) => setFaqEditing((f) => f && { ...f, key: e.target.value })}
                        placeholder="delivery"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Answer (English)</label>
                    <textarea
                      value={faqEditing.answer_en}
                      onChange={(e) => setFaqEditing((f) => f && { ...f, answer_en: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Answer (বাংলা)</label>
                    <textarea
                      value={faqEditing.answer_bn}
                      onChange={(e) => setFaqEditing((f) => f && { ...f, answer_bn: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Customer questions / keywords
                    </label>
                    <textarea
                      value={faqEditing.questions ?? ""}
                      onChange={(e) => setFaqEditing((f) => f && { ...f, questions: e.target.value })}
                      rows={3}
                      placeholder={"ঢাকার বাইরে ডেলিভারি হয়?\ndhakar baire delivery\ndo you deliver outside dhaka"}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      এক লাইনে একটি প্রশ্ন/কিওয়ার্ড — বাংলা, English বা Banglish। গ্রাহক এগুলোর কাছাকাছি কিছু লিখলে এই উত্তরটি দেখানো হবে।
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setFaqEditing(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
                    <button
                      onClick={saveFaq}
                      disabled={faqSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
                    >
                      {faqSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {faqIsNew ? "Create" : "Update"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
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
    </div>
  );
}
