"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, Bell, CalendarCheck, CheckCheck, CreditCard, Loader2, Package, Search, ShoppingCart, UserPlus, X,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { notificationsApi, type NotificationRecord } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import SystemAlerts from "./SystemAlerts";

/** Tabs → backend `type` filter (comma = several types). "system" shows the
 * live operations feed (failed emails/payments, runtime errors) instead. */
const TABS: { id: string; label: string; types?: string; icon: React.ElementType }[] = [
  { id: "all", label: "সব", icon: Bell },
  { id: "order", label: "অর্ডার", types: "new_order", icon: ShoppingCart },
  { id: "booking", label: "বুকিং", types: "new_booking", icon: CalendarCheck },
  { id: "lead", label: "লিড", types: "new_lead", icon: UserPlus },
  { id: "payment", label: "পেমেন্ট", types: "payment_failed", icon: CreditCard },
  { id: "stock", label: "স্টক", types: "low_stock,out_of_stock", icon: Package },
  { id: "system", label: "সিস্টেম সতর্কতা", icon: AlertTriangle },
];

const TYPE_META: Record<string, { icon: React.ElementType; tone: string }> = {
  new_order: { icon: ShoppingCart, tone: "bg-emerald-50 text-emerald-700" },
  new_booking: { icon: CalendarCheck, tone: "bg-sky-50 text-sky-700" },
  new_lead: { icon: UserPlus, tone: "bg-violet-50 text-violet-700" },
  payment_failed: { icon: CreditCard, tone: "bg-red-50 text-red-700" },
  low_stock: { icon: Package, tone: "bg-amber-50 text-amber-700" },
  out_of_stock: { icon: Package, tone: "bg-red-50 text-red-700" },
};
const SEVERITY_BN: Record<string, string> = { error: "জরুরি", warning: "সতর্কতা", info: "তথ্য" };

const dhakaDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
function dayLabel(iso: string): string {
  const d = dhakaDay(iso);
  const today = dhakaDay(new Date().toISOString());
  const yesterday = dhakaDay(new Date(Date.now() - 86400000).toISOString());
  if (d === today) return "আজ";
  if (d === yesterday) return "গতকাল";
  return new Date(iso).toLocaleDateString("bn-BD", { timeZone: "Asia/Dhaka", day: "numeric", month: "long", year: "numeric" });
}
function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const n = (v: number) => Math.round(v).toLocaleString("bn-BD");
  if (s < 60) return "এইমাত্র";
  if (s < 3600) return `${n(s / 60)} মিনিট আগে`;
  if (s < 86400) return `${n(s / 3600)} ঘণ্টা আগে`;
  return new Date(iso).toLocaleTimeString("bn-BD", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit" });
}

export default function AdminNotificationsPage() {
  const toast = useToastStore((s) => s.push);
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const PER_PAGE = 30;
  const tabTypes = TABS.find((t) => t.id === tab)?.types;

  const load = useCallback(async () => {
    if (tab === "system") return;
    setLoading(true);
    try {
      const r = await notificationsApi.list({ page, per_page: PER_PAGE, unread_only: unreadOnly, type: tabTypes });
      const data = r.data.data ?? [];
      setItems(data);
      setTotal(r.data.meta?.total ?? data.length);
    } catch (err) {
      setItems([]);
      toast("error", apiErrorMessage(err, "নোটিফিকেশন আনা যায়নি"));
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly, tab, tabTypes, toast]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) {
      toast("error", apiErrorMessage(err, "পড়া হয়েছে চিহ্ন দেওয়া যায়নি"));
    }
  };

  const [dismissTarget, setDismissTarget] = useState<string | null>(null);

  const performDismiss = async () => {
    const id = dismissTarget;
    if (!id) return;
    setDismissTarget(null);
    try {
      await notificationsApi.dismiss(id);
      setItems((prev) => prev.filter((n) => n.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      toast("error", apiErrorMessage(err, "সরানো যায়নি"));
    }
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast("success", "সব নোটিফিকেশন পড়া হয়েছে");
    } catch (err) {
      toast("error", apiErrorMessage(err, "সব পড়া হয়েছে করা যায়নি"));
    }
  };

  // Search filters the loaded page; then group by Bangladesh date.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const shown = q ? items.filter((n) => `${n.title} ${n.body ?? ""}`.toLowerCase().includes(q)) : items;
    const out: { label: string; rows: NotificationRecord[] }[] = [];
    for (const n of shown) {
      const label = dayLabel(n.created_at);
      const last = out[out.length - 1];
      if (last && last.label === label) last.rows.push(n);
      else out.push({ label, rows: [n] });
    }
    return out;
  }, [items, query]);

  const totalPages = Math.ceil(total / PER_PAGE);
  const switchTab = (id: string) => { setTab(id); setPage(1); setQuery(""); };

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Notifications"
        titleBn="নোটিফিকেশন"
        description="Orders, bookings, leads, payment and stock alerts, plus live system warnings"
        descriptionBn="অর্ডার, বুকিং, লিড, পেমেন্ট ও স্টকের খবর — আর সিস্টেমের সতর্কতা, সব এক জায়গায়"
        actions={tab !== "system" ? (
          <button type="button" onClick={markAllRead} className="btn btn-outline btn-sm min-h-11 gap-1.5">
            <CheckCheck className="w-4 h-4" aria-hidden /> সব পড়া হয়েছে
          </button>
        ) : undefined}
      />

      <div role="tablist" aria-label="নোটিফিকেশনের ধরন" className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => switchTab(id)}
            className={`btn btn-sm min-h-11 gap-1.5 whitespace-nowrap flex-none ${tab === id ? "btn-brand" : "btn-outline"}`}>
            <Icon className="w-4 h-4" aria-hidden /> {label}
          </button>
        ))}
      </div>

      {tab === "system" ? (
        <SystemAlerts />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative flex-1 min-w-[12rem]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="এই পাতায় খুঁজুন…" aria-label="নোটিফিকেশন খুঁজুন" className="input pl-9 min-h-11 w-full" />
            </label>
            <label className="inline-flex items-center gap-2 min-h-11 px-3 rounded-xl border border-gray-200 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }} className="w-4 h-4" />
              শুধু না-পড়া
            </label>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-brand-500" aria-label="লোড হচ্ছে" /></div>
          ) : groups.length === 0 ? (
            <div className="admin-card p-10 text-center text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" aria-hidden />
              {query ? "এই খোঁজে কিছু পাওয়া যায়নি" : unreadOnly ? "না-পড়া কোনো নোটিফিকেশন নেই" : "এখনো কোনো নোটিফিকেশন নেই"}
            </div>
          ) : (
            groups.map((g) => (
              <section key={g.label} className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-500 px-1">{g.label}</h2>
                <div className="admin-card divide-y divide-gray-100 overflow-hidden">
                  {g.rows.map((n) => {
                    const meta = TYPE_META[n.type] ?? { icon: Bell, tone: "bg-brand-50 text-brand-700" };
                    const Icon = meta.icon;
                    return (
                      <div key={n.id} className={`flex items-start gap-3 px-4 sm:px-5 py-3.5 ${!n.is_read ? "bg-brand-50/40" : ""}`}>
                        <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${meta.tone}`}><Icon className="w-5 h-5" aria-hidden /></span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            {!n.is_read && <span className="mt-2 w-2 h-2 rounded-full bg-brand-500 flex-none" aria-label="না-পড়া" />}
                            {n.link ? (
                              <Link href={n.link} onClick={() => !n.is_read && markRead(n.id)} className="font-semibold text-gray-900 hover:text-brand-600 break-words">
                                {n.title}
                              </Link>
                            ) : (
                              <p className="font-semibold text-gray-900 break-words">{n.title}</p>
                            )}
                          </div>
                          {n.body && <p className="text-sm text-gray-600 mt-0.5 break-words">{n.body}</p>}
                          <p className="text-xs text-gray-500 mt-1">
                            {timeAgo(n.created_at)}
                            {n.severity !== "info" && <> · <span className={n.severity === "error" ? "text-red-600" : "text-amber-700"}>{SEVERITY_BN[n.severity] ?? n.severity}</span></>}
                            {n.broadcast && " · সবার জন্য"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!n.is_read && (
                            <button type="button" onClick={() => markRead(n.id)} className="min-h-11 min-w-11 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500" aria-label="পড়া হয়েছে" title="পড়া হয়েছে">
                              <CheckCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button type="button" onClick={() => setDismissTarget(n.id)} className="min-h-11 min-w-11 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400" aria-label="সরিয়ে দিন" title="সরিয়ে দিন">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn btn-outline btn-sm min-h-11">আগের</button>
              <span className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50 rounded-lg border border-gray-200">পাতা {page.toLocaleString("bn-BD")} / {totalPages.toLocaleString("bn-BD")}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn btn-outline btn-sm min-h-11">পরের</button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!dismissTarget}
        title="এই নোটিফিকেশন সরাবেন?"
        message="তালিকা থেকে সরে যাবে — ফেরত আনা যাবে না।"
        confirmLabel="সরিয়ে দিন"
        variant="warning"
        onConfirm={() => void performDismiss()}
        onCancel={() => setDismissTarget(null)}
      />
    </div>
  );
}
