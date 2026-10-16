"use client";

import AiTextMenu from "@/components/admin/catalog/AiTextMenu";
import { formatDhakaBn } from "@/lib/flashSale";
import { useCallback, useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  Loader2, Save, RefreshCw, Check, Trash2, Plus, Pencil, X,
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
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import StatusBadge from "@/components/admin/StatusBadge";
import TranslateButton from "@/components/admin/TranslateButton";
import { translateBnToEn } from "@/lib/translate";

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
  { label: "পণ্য", table: "products", desc: "খোঁজা, দাম, স্টক, ক্যাটাগরি" },
  { label: "সেবা", table: "services", desc: "তথ্য, দামের প্যাকেজ, বুকিং" },
  { label: "অর্ডার", table: "orders + order_items", desc: "অর্ডার, ট্র্যাকিং, ইনভয়েস" },
  { label: "বুকিং", table: "bookings_v2", desc: "সেবা বুকিং ও অবস্থা" },
  { label: "লিড", table: "leads_v2", desc: "জিজ্ঞাসা / কোটেশন জমা" },
  { label: "সেটিংস", table: "settings", desc: "ডেলিভারি চার্জ, স্বাগত বার্তা, সুইচ" },
  { label: "প্রশ্নোত্তর ভাণ্ডার", table: "assistant_faq_knowledge", desc: "অ্যাডমিনের প্রশ্নোত্তর (ওয়েবসাইটের /faq পাতা থেকে আলাদা)" },
  { label: "কুপন", table: "coupons_json", desc: "কুপন যাচাই ও তালিকা" },
  { label: "ব্লগ", table: "blog_posts", desc: "খোঁজা ও নতুন পোস্ট" },
  { label: "কথোপকথন", table: "assistant_conversations", desc: "সেশনের ইতিহাস ও লগ" },
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
      toast("error", "অ্যাসিস্ট্যান্টের সেটিং আনা যায়নি");
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
      toast("error", "কথোপকথন আনা যায়নি");
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
      toast("error", "অটোমেশনের লগ আনা যায়নি");
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
      toast("error", "প্রশ্নোত্তর আনা যায়নি");
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
      toast("success", "অ্যাসিস্ট্যান্টের সেটিং সংরক্ষিত হয়েছে");
    } catch {
      toast("error", "সেটিংস সংরক্ষণ করা যায়নি");
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
      toast("error", "কথোপকথন আনা যায়নি");
    } finally {
      setConvDetailLoading(false);
    }
  };

  const deleteConversation = (id: string) => {
    setConfirmState({
      title: "এই কথোপকথন আর্কাইভ করবেন?",
      message: "This conversation will be hidden from the active conversation list. Its history will be preserved.",
      action: async () => {
        setConfirmState(null);
        setDeletingConvId(id);
        try {
          await assistantAdminApi.deleteConversation(id);
          toast("success", "কথোপকথন আর্কাইভ হয়েছে");
          if (convDetail?.conversation.id === id) setConvDetail(null);
          await loadConversations();
        } catch {
          toast("error", "কথোপকথন আর্কাইভ করা যায়নি");
        } finally {
          setDeletingConvId(null);
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
    if (!faqEditing.key.trim()) { toast("error", "প্রশ্নোত্তরের key দিন"); return; }
    // Bangla-first: fill an empty English answer from the Bangla one.
    let fe = faqEditing;
    if (!fe.answer_en.trim() && fe.answer_bn.trim()) {
      setFaqSaving(true);
      try { fe = { ...fe, answer_en: await translateBnToEn(fe.answer_bn) }; setFaqEditing(fe); }
      catch { setFaqSaving(false); toast("error", "অটো-অনুবাদ ব্যর্থ — English answer নিজে লিখুন"); return; }
      setFaqSaving(false);
    }
    if (!fe.answer_en.trim()) { toast("error", "ইংরেজি উত্তর দিন (বাংলা লিখলে নিজে অনুবাদ হবে)"); return; }

    setFaqSaving(true);
    try {
      if (faqIsNew) {
        await assistantAdminApi.createFaq({
          key: fe.key,
          answer_en: fe.answer_en,
          answer_bn: fe.answer_bn || undefined,
          questions: fe.questions || undefined,
        });
        toast("success", "প্রশ্নোত্তর তৈরি হয়েছে");
      } else {
        await assistantAdminApi.updateFaq(fe.key, {
          answer_en: fe.answer_en,
          answer_bn: fe.answer_bn,
          questions: fe.questions ?? "",
        });
        toast("success", "প্রশ্নোত্তর আপডেট হয়েছে");
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
          toast("success", "প্রশ্নোত্তর মুছে ফেলা হয়েছে");
          await loadFaq();
        } catch {
          toast("error", "প্রশ্নোত্তর মুছে ফেলা যায়নি");
        } finally {
          setDeletingFaqKey(null);
        }
      },
    });
  };

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "settings", label: "সেটিংস", icon: Settings2 },
    { id: "conversations", label: "কথোপকথন", icon: MessageSquare },
    { id: "logs", label: "অটোমেশন লগ", icon: Zap },
    { id: "faq", label: "প্রশ্নোত্তর ভাণ্ডার", icon: BookOpen },
  ];

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="AI Assistant"
        titleBn="AI সহকারী"
        description="Manage automation assistant, WhatsApp integration, conversations and knowledge base"
        descriptionBn="ওয়েবসাইটের চ্যাট সহকারী — হোয়াটসঅ্যাপ সংযোগ, গ্রাহকের কথোপকথন আর প্রশ্নোত্তর (জ্ঞানভাণ্ডার) এখান থেকে সামলান।"
      />

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
        <div className="space-y-6">
          <Link href="/sumon/ai" className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-4 hover:border-brand-300">
            <span className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center flex-none"><Sparkles className="w-5 h-5" /></span>
            <span className="flex-1 min-w-0"><span className="block font-semibold text-heading">AI কী ও মডেল — “AI সংযোগ” পাতায়</span>
              <span className="block text-xs text-muted">Gemini, Groq, ChatGPT ইত্যাদি সব কী সেখানে যোগ ও পরীক্ষা করুন। এই সহকারী সেখান থেকে নিজে সেরা AI ব্যবহার করে।</span></span>
            <ArrowRight className="w-4 h-4 text-brand-600 flex-none" />
          </Link>

          {/* Integration overview */}
          <div className="admin-surface bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-brand-600" />
              <h2 className="text-sm font-semibold text-gray-800">সহকারী কোন কোন অংশ দেখতে পারে</h2>
            </div>
            <div className="p-6 grid sm:grid-cols-2 gap-3">
              {INTEGRATIONS.map((item) => (
                <div key={item.label} className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <Database className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
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
            <div className="admin-surface bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-sm font-semibold text-gray-800">ফিচার চালু/বন্ধ</h2>
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
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-3 pb-1">সাধারণ</p>
                <div className="divide-y divide-gray-50">
                  <Toggle
                    label="ওয়েবসাইটে চ্যাট সহকারী চালু (সব পাতায়)"
                    hint="Master switch — hides the floating assistant when off"
                    checked={config.feature_assistant_chat}
                    onChange={(v) => setConfig((c) => ({ ...c, feature_assistant_chat: v }))}
                  />
                  <Toggle
                    label="সহকারীর ভেতরে হোয়াটসঅ্যাপ অপশন"
                    checked={config.feature_assistant_whatsapp}
                    onChange={(v) => setConfig((c) => ({ ...c, feature_assistant_whatsapp: v }))}
                  />
                </div>

                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-5 pb-1">স্বয়ংক্রিয় কাজ (ডাটা লেখে)</p>
                <div className="divide-y divide-gray-50">
                  <Toggle label="চ্যাটে অর্ডার" hint="Multi-step order → orders table" checked={config.assistant_feature_orders} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_orders: v }))} />
                  <Toggle label="চ্যাটে সেবা বুকিং" hint="Multi-step booking → bookings_v2" checked={config.assistant_feature_bookings} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_bookings: v }))} />
                  <Toggle label="লিড / কোটেশন জমা" hint="Inquiry → leads_v2" checked={config.assistant_feature_leads} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_leads: v }))} />
                  <Toggle label="গ্রাহকের অভিযোগ → অ্যাডমিনকে জানানো" checked={config.assistant_feature_complaints} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_complaints: v }))} />
                </div>

                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-5 pb-1">ট্র্যাকিং (ডাটা পড়ে)</p>
                <div className="divide-y divide-gray-50">
                  <Toggle label="অর্ডার ট্র্যাকিং" hint="By order number or phone" checked={config.assistant_feature_order_tracking} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_order_tracking: v }))} />
                  <Toggle label="বুকিং ট্র্যাকিং" hint="By BK- number or phone" checked={config.assistant_feature_booking_tracking} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_booking_tracking: v }))} />
                  <Toggle label="লিড / জিজ্ঞাসা ট্র্যাকিং" hint="By LF- number or phone" checked={config.assistant_feature_lead_tracking} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_lead_tracking: v }))} />
                </div>

                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-5 pb-1">ক্যাটালগ ও তথ্য</p>
                <div className="divide-y divide-gray-50">
                  <Toggle label="পণ্য খোঁজা ও বিস্তারিত" checked={config.assistant_feature_product_search} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_product_search: v }))} />
                  <Toggle label="সেবার তথ্য ও দাম" checked={config.assistant_feature_service_info} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_service_info: v }))} />
                  <Toggle label="কুপন" checked={config.assistant_feature_coupons} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_coupons: v }))} />
                  <Toggle label="ইনভয়েস সাহায্য" checked={config.assistant_feature_invoices} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_invoices: v }))} />
                  <Toggle label="ডেলিভারি তথ্য ও চার্জ" checked={config.assistant_feature_delivery_info} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_delivery_info: v }))} />
                  <Toggle label="প্রশ্নোত্তরের উত্তর" hint="Uses FAQ tab + admin settings" checked={config.assistant_feature_faq} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_faq: v }))} />
                  <Toggle label="ব্লগ পোস্ট" checked={config.assistant_feature_blog} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_blog: v }))} />
                  <Toggle label="না পেলে ওয়েবে খোঁজা" hint="DuckDuckGo when DB has no match" checked={config.assistant_feature_web_search} onChange={(v) => setConfig((c) => ({ ...c, assistant_feature_web_search: v }))} />
                </div>

                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-5 pb-1">বার্তা</p>
                <div className="py-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">হোয়াটসঅ্যাপ নম্বর</label>
                    <input type="tel" value={config.whatsapp_number} onChange={(e) => setConfig((c) => ({ ...c, whatsapp_number: e.target.value }))} placeholder="8801825007977" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                  </div>
                  <div>
                    <label className="flex items-center justify-between gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      স্বাগত বার্তা (ইংরেজি)
                      <TranslateButton bn={config.assistant_welcome_bn} onResult={(en) => setConfig((c) => ({ ...c, assistant_welcome_en: en }))} en={config.assistant_welcome_en} onResultBn={(b) => setConfig((c) => ({ ...c, assistant_welcome_bn: b }))} />
                      <AiTextMenu compact text={config.assistant_welcome_en} onApply={(v) => setConfig((c) => ({ ...c, assistant_welcome_en: v }))} context="website chat assistant welcome message (English)" />
                    </label>
                    <textarea value={config.assistant_welcome_en} onChange={(e) => setConfig((c) => ({ ...c, assistant_welcome_en: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                  </div>
                  <div>
                    <label className="flex items-center justify-between gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">স্বাগত বার্তা (বাংলা)<AiTextMenu compact text={config.assistant_welcome_bn} onApply={(v) => setConfig((c) => ({ ...c, assistant_welcome_bn: v }))} context="website chat assistant welcome message (Bangla)" /></label>
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
              placeholder="সেশন, নাম বা ফোন দিয়ে খুঁজুন…"
              className="flex-1 max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <button type="button" onClick={loadConversations} aria-label="আবার আনুন" title="আবার আনুন" className="min-h-11 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
              <RefreshCw className={`w-4 h-4 ${convLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="admin-surface bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {convLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
            ) : conversations.length === 0 ? (
              <p className="text-center text-gray-500 py-16 text-sm">এখনো কোনো কথোপকথন নেই</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-responsive">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">সেশন</th>
                      <th className="text-left px-4 py-3">গ্রাহক</th>
                      <th className="text-left px-4 py-3">উদ্দেশ্য</th>
                      <th className="text-left px-4 py-3">বার্তা</th>
                      <th className="text-left px-4 py-3">আপডেট</th>
                      <th className="text-right px-4 py-3">কাজ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {conversations.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-mono text-xs" data-label="সেশন">{c.session_id.slice(0, 12)}…</td>
                        <td className="px-4 py-3" data-label="গ্রাহক">
                          <div>{c.customer_name || "—"}</div>
                          <div className="text-xs text-gray-400">{c.customer_phone || ""}</div>
                        </td>
                        <td className="px-4 py-3" data-label="উদ্দেশ্য">{c.last_intent ? <StatusBadge status={c.last_intent} /> : "—"}</td>
                        <td className="px-4 py-3" data-label="বার্তা">{c.message_count}</td>
                        <td className="px-4 py-3 text-xs text-gray-500" data-label="আপডেট">{formatDhakaBn(new Date(c.updated_at))}</td>
                        <td className="px-4 py-3 text-right" data-label="কাজ">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            <button onClick={() => viewConversation(c.id)} className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600" title="দেখুন">
                              <span className="sr-only">কথোপকথন দেখুন</span>
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteConversation(c.id)}
                              disabled={deletingConvId === c.id}
                              aria-label="কথোপকথন আর্কাইভ"
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                              title="আর্কাইভ"
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
              <button disabled={convPage <= 1} onClick={() => setConvPage((p) => p - 1)} className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40">আগের</button>
              <span className="text-sm text-gray-500 py-1">Page {convPage}</span>
              <button disabled={convPage * 20 >= convTotal} onClick={() => setConvPage((p) => p + 1)} className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40">পরের</button>
            </div>
          )}

          {(convDetail || convDetailLoading) && (
            <div
              className="admin-overlay admin-overlay--panel fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
              onClick={() => setConvDetail(null)}
              role="dialog"
              aria-modal="true"
              aria-label="কথোপকথনের বিস্তারিত"
            >
              <div className="admin-sheet admin-sheet--m bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b">
                  <h3 className="font-semibold">কথোপকথনের বিস্তারিত</h3>
                  <button aria-label="বন্ধ করুন" type="button" onClick={() => setConvDetail(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
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
            <button type="button" onClick={loadLogs} aria-label="আবার আনুন" title="আবার আনুন" className="min-h-11 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
              <RefreshCw className={`w-4 h-4 ${logsLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="admin-surface bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {logsLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
            ) : logs.length === 0 ? (
              <p className="text-center text-gray-500 py-16 text-sm">এখনো কোনো অটোমেশন লগ নেই</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-responsive">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">কাজ</th>
                      <th className="text-left px-4 py-3">উদ্দেশ্য</th>
                      <th className="text-left px-4 py-3">অবস্থা</th>
                      <th className="text-left px-4 py-3">সেশন</th>
                      <th className="text-left px-4 py-3">সময়</th>
                      <th className="text-right px-4 py-3">কতদিন রাখা হবে</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium" data-label="কাজ">{log.action}</td>
                        <td className="px-4 py-3" data-label="উদ্দেশ্য">{log.intent || "—"}</td>
                        <td className="px-4 py-3" data-label="অবস্থা"><StatusBadge status={log.status} /></td>
                        <td className="px-4 py-3 font-mono text-xs" data-label="সেশন">{log.session_id?.slice(0, 10) || "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500" data-label="সময়">{formatDhakaBn(new Date(log.created_at))}</td>
                        <td className="px-4 py-3 text-right text-xs font-medium text-emerald-600" data-label="কতদিন রাখা হবে">রাখা হয়েছে</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {logsTotal > 20 && (
            <div className="flex justify-center gap-2">
              <button disabled={logsPage <= 1} onClick={() => setLogsPage((p) => p - 1)} className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40">আগের</button>
              <span className="text-sm text-gray-500 py-1">Page {logsPage}</span>
              <button disabled={logsPage * 20 >= logsTotal} onClick={() => setLogsPage((p) => p + 1)} className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40">পরের</button>
            </div>
          )}
        </div>
      )}

      {/* FAQ Tab */}
      {tab === "faq" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-full min-w-0 min-[641px]:flex-1 min-[641px]:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                placeholder="প্রশ্নোত্তর খুঁজুন…"
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
              />
            </div>
            <p className="text-sm text-gray-500">{faqList.length} entries</p>
            <button onClick={openNewFaq} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
              <Plus className="w-4 h-4" /> প্রশ্নোত্তর যোগ
            </button>
          </div>

          <div className="admin-surface bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {faqLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
            ) : faqList.length === 0 ? (
              <p className="text-center text-gray-500 py-16 text-sm">কোনো প্রশ্নোত্তর নেই — প্রথমটি যোগ করুন।</p>
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
              className="admin-overlay admin-overlay--panel fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
              onClick={() => setFaqEditing(null)}
              role="dialog"
              aria-modal="true"
              aria-label={faqIsNew ? "Add FAQ entry" : "Edit FAQ entry"}
            >
              <div className="admin-sheet admin-sheet--m bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b">
                  <h3 className="font-semibold">{faqIsNew ? "Add FAQ Entry" : `Edit: ${faqEditing.key}`}</h3>
                  <button aria-label="বন্ধ করুন" type="button" onClick={() => setFaqEditing(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5 space-y-4">
                  {faqIsNew && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Key (যেমন delivery, warranty)</label>
                      <input
                        value={faqEditing.key}
                        onChange={(e) => setFaqEditing((f) => f && { ...f, key: e.target.value })}
                        placeholder="delivery"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                  )}
                  <div>
                    <label className="flex items-center justify-between gap-2 text-xs font-semibold text-gray-500 uppercase mb-1">
                      উত্তর (ইংরেজি)
                      <TranslateButton bn={faqEditing.answer_bn} onResult={(en) => setFaqEditing((f) => f && { ...f, answer_en: en })} en={faqEditing.answer_en} onResultBn={(b) => setFaqEditing((f) => f && { ...f, answer_bn: b })} />
                      <AiTextMenu compact text={faqEditing.answer_en} onApply={(v) => setFaqEditing((f) => f && { ...f, answer_en: v })} context="chat assistant FAQ answer (English)" />
                    </label>
                    <textarea
                      value={faqEditing.answer_en}
                      onChange={(e) => setFaqEditing((f) => f && { ...f, answer_en: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="flex items-center justify-between gap-2 text-xs font-semibold text-gray-500 uppercase mb-1">উত্তর (বাংলা)<AiTextMenu compact text={faqEditing.answer_bn ?? ""} onApply={(v) => setFaqEditing((f) => f && { ...f, answer_bn: v })} context="chat assistant FAQ answer (Bangla)" /></label>
                    <textarea
                      value={faqEditing.answer_bn}
                      onChange={(e) => setFaqEditing((f) => f && { ...f, answer_bn: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      গ্রাহকের প্রশ্ন / কীওয়ার্ড
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
                  <div className="flex justify-end gap-2 flex-wrap pt-2">
                    <button onClick={() => setFaqEditing(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">বাতিল</button>
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
        confirmLabel={confirmState?.title.startsWith("Archive") ? "Archive" : "Delete"}
        variant={confirmState?.title.startsWith("Archive") ? "warning" : "danger"}
        onConfirm={() => confirmState?.action()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
