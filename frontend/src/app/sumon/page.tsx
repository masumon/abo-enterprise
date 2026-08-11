"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShoppingCart, Briefcase, Users, Package,
  Clock, TrendingUp, RefreshCw, DollarSign, Sparkles, BarChart3,
  CreditCard, AlertTriangle,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import api from "@/lib/api";
import StatsCard from "@/components/admin/StatsCard";
import StatusBadge from "@/components/admin/StatusBadge";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminQuickActions from "@/components/admin/AdminQuickActions";
import DashboardOperationsPanel from "@/app/sumon/DashboardOperationsPanel";
import { formatPrice } from "@/lib/utils";
import { useAlertStore } from "@/store/alerts";
import { useLanguageStore } from "@/store/language";
import { ADMIN_QUICK_ACTIONS } from "@/lib/adminNav";

interface Stats {
  total_orders: number;
  pending_orders: number;
  total_bookings: number;
  pending_bookings: number;
  new_leads: number;
  total_leads: number;
  total_products: number;
  recent_orders: Array<{ id: string; order_number: string; customer_name: string; total: number; order_status: string; created_at: string }>;
  recent_leads: Array<{ id: string; name: string; lead_type: string; phone: string; status: string; created_at: string }>;
}

interface AnalyticsOverview {
  revenue: { total: number; orders: number; bookings: number };
  counts: { orders: number; bookings: number; leads: number; leads_won: number };
  conversion_rate: number;
  trends: { revenue_pct: number | null; orders_pct: number | null; bookings_pct: number | null; leads_pct: number | null };
  top_services: Array<{ service_id: string; name: string; name_bn: string; count: number; revenue: number }>;
}

interface OpsErrors {
  failed_payments: Array<{ order_number: string; customer: string; total: number; at: string }>;
  failed_emails: Array<{ at: string; [key: string]: unknown }>;
}

interface InventorySummary {
  products: number;
  low_stock: number;
  out_of_stock: number;
  units: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [ops, setOps] = useState<OpsErrors | null>(null);
  const [inventory, setInventory] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const { lastUpdated, pendingOrders, pendingBookings, newLeads } = useAlertStore();
  const { lang } = useLanguageStore();
  const bn = lang === "bn";

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [statsRes, analyticsRes, opsRes, inventoryRes] = await Promise.all([
        adminApi.stats(),
        api.get("/api/v1/admin/analytics/overview?days=30").catch(() => null),
        api.get("/api/v1/admin/ops/errors").catch(() => null),
        api.get("/api/v1/admin/inventory/summary").catch(() => null),
      ]);
      setStats(statsRes.data.data as Stats);
      setAnalytics((analyticsRes?.data?.data ?? null) as AnalyticsOverview | null);
      setOps((opsRes?.data?.data ?? null) as OpsErrors | null);
      setInventory((inventoryRes?.data?.data ?? null) as InventorySummary | null);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    if (lastUpdated) fetchStats(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUpdated]);

  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString(bn ? "bn-BD" : "en-BD", { hour: "2-digit", minute: "2-digit" })
    : null;
  const quickActions = ADMIN_QUICK_ACTIONS.map((a) => ({
    ...a,
    badge: a.href === "/sumon/orders" ? pendingOrders : a.href === "/sumon/bookings" ? pendingBookings : a.href === "/sumon/leads" ? newLeads : undefined,
  }));
  const h = new Date().getHours();
  const greetBn = h < 12 ? "সুপ্রভাত" : h < 17 ? "শুভ অপরাহ্ন" : "শুভ সন্ধ্যা";
  const greetEn = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const revenueTotal = analytics?.revenue.total ?? null;
  const revenueTrend = analytics?.trends.revenue_pct ?? null;
  const conversionRate = analytics?.conversion_rate ?? null;
  const failedPayments = ops?.failed_payments?.length ?? 0;
  const lowStock = inventory?.low_stock ?? 0;
  const outOfStock = inventory?.out_of_stock ?? 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`${greetEn}!`}
        titleBn={`${greetBn}!`}
        description="Business command center — what needs attention, what changed, and what is performing"
        descriptionBn="ব্যবসার কমান্ড সেন্টার — এখন কী দরকার, কী পরিবর্তন হয়েছে এবং কী ভালো চলছে"
        actions={<div className="flex items-center gap-2">
          {updatedLabel && <span className="text-xs text-gray-400 hidden sm:inline">{bn ? "আপডেট" : "Updated"} {updatedLabel}</span>}
          <button onClick={() => fetchStats(true)} disabled={refreshing} className="admin-btn-secondary !py-2 !px-3" title={bn ? "রিফ্রেশ" : "Refresh"} aria-label={bn ? "রিফ্রেশ" : "Refresh"}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>}
      />

      {error && <div role="alert" className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
        <span aria-hidden="true">!</span>
        {bn ? "ড্যাশবোর্ডের কিছু তথ্য লোড হয়নি। রিফ্রেশ চাপুন।" : "Some dashboard data failed to load. Press refresh."}
      </div>}

      <section>
        <div className="flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4 text-brand-500" /><h2 className="text-sm font-semibold text-gray-700">{bn ? "দ্রুত কাজ" : "Quick Actions"}</h2></div>
        <AdminQuickActions actions={quickActions} />
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3"><Clock className="w-4 h-4 text-gray-400" /><h2 className="text-sm font-semibold text-gray-700">{bn ? "এখন মনোযোগ দরকার" : "Needs attention"}</h2></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Link href="/sumon/orders" className="admin-card p-4 hover:border-brand-200 transition-colors"><p className="text-xs text-gray-500">{bn ? "অপেক্ষমান অর্ডার" : "Pending orders"}</p><p className="text-2xl font-bold text-gray-900 mt-1">{loading ? "—" : stats?.pending_orders ?? 0}</p><p className="text-xs text-brand-600 mt-1">{bn ? "অর্ডার দেখুন →" : "Review orders →"}</p></Link>
          <Link href="/sumon/bookings" className="admin-card p-4 hover:border-brand-200 transition-colors"><p className="text-xs text-gray-500">{bn ? "অপেক্ষমান বুকিং" : "Pending bookings"}</p><p className="text-2xl font-bold text-gray-900 mt-1">{loading ? "—" : stats?.pending_bookings ?? 0}</p><p className="text-xs text-brand-600 mt-1">{bn ? "বুকিং দেখুন →" : "Review bookings →"}</p></Link>
          <Link href="/sumon/leads" className="admin-card p-4 hover:border-brand-200 transition-colors"><p className="text-xs text-gray-500">{bn ? "নতুন লিড" : "New leads"}</p><p className="text-2xl font-bold text-gray-900 mt-1">{loading ? "—" : stats?.new_leads ?? 0}</p><p className="text-xs text-brand-600 mt-1">{bn ? "লিড দেখুন →" : "Follow up leads →"}</p></Link>
          <Link href="/sumon/payments" className="admin-card p-4 hover:border-brand-200 transition-colors"><p className="text-xs text-gray-500 flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" />{bn ? "ব্যর্থ পেমেন্ট" : "Failed payments"}</p><p className="text-2xl font-bold text-gray-900 mt-1">{loading ? "—" : failedPayments}</p><p className="text-xs text-brand-600 mt-1">{bn ? "পেমেন্ট দেখুন →" : "Review payments →"}</p></Link>
          <Link href="/sumon/inventory" className="admin-card p-4 hover:border-brand-200 transition-colors"><p className="text-xs text-gray-500 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{bn ? "কম স্টক" : "Low stock"}</p><p className="text-2xl font-bold text-gray-900 mt-1">{loading ? "—" : lowStock}</p><p className="text-xs text-brand-600 mt-1">{outOfStock > 0 ? (bn ? `${outOfStock}টি স্টক শেষ` : `${outOfStock} out of stock`) : (bn ? "ইনভেন্টরি দেখুন →" : "Review inventory →")}</p></Link>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {revenueTotal !== null && <StatsCard title={bn ? "রেভিনিউ (৩০ দিন)" : "Revenue (30d)"} value={`৳${revenueTotal.toLocaleString()}`} sub={revenueTrend == null ? (bn ? "অর্ডার + বুকিং" : "orders + bookings") : `${revenueTrend >= 0 ? "▲" : "▼"} ${Math.abs(revenueTrend)}% ${bn ? "আগের ৩০ দিনের তুলনায়" : "vs previous 30d"}`} icon={DollarSign} color="brand" loading={loading} href="/sumon/analytics" />}
        <StatsCard title={bn ? "অর্ডার" : "Orders"} value={stats?.total_orders ?? 0} sub={bn ? `${stats?.pending_orders ?? 0} অপেক্ষমান` : `${stats?.pending_orders ?? 0} pending`} icon={ShoppingCart} color="brand" loading={loading} alert={!!stats?.pending_orders} href="/sumon/orders" />
        <StatsCard title={bn ? "বুকিং" : "Bookings"} value={stats?.total_bookings ?? 0} sub={bn ? `${stats?.pending_bookings ?? 0} অপেক্ষমান` : `${stats?.pending_bookings ?? 0} pending`} icon={Briefcase} color="accent" loading={loading} alert={!!stats?.pending_bookings} href="/sumon/bookings" />
        <StatsCard title={bn ? "লিড" : "Leads"} value={stats?.total_leads ?? 0} sub={bn ? `${stats?.new_leads ?? 0} নতুন` : `${stats?.new_leads ?? 0} new`} icon={Users} color="green" loading={loading} alert={!!stats?.new_leads} href="/sumon/leads" />
        <StatsCard title={bn ? "পণ্য" : "Products"} value={stats?.total_products ?? 0} sub={bn ? "সক্রিয়" : "active"} icon={Package} color="amber" loading={loading} href="/sumon/products" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="admin-card lg:col-span-2">
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base"><Clock className="w-4 h-4 text-gray-400" />{bn ? "সাম্প্রতিক অর্ডার" : "Recent Orders"}</h2><Link href="/sumon/orders" className="text-xs text-brand-600 hover:underline font-medium">{bn ? "সব দেখুন" : "View all"} →</Link></div>
          <div className="divide-y divide-gray-50">
            {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="px-5 py-3 flex gap-3"><div className="flex-1 h-4 bg-gray-100 rounded animate-pulse" /></div>) : stats?.recent_orders?.length === 0 ? <p className="px-5 py-10 text-center text-gray-400 text-sm">{bn ? "এখনও কোনো অর্ডার নেই" : "No orders yet"}</p> : stats?.recent_orders?.map((order) => <Link key={order.id} href={`/sumon/orders?open=${order.id}`} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/80 transition-colors"><div className="min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{order.customer_name}</p><p className="text-xs text-gray-400">{order.order_number}</p></div><div className="text-right shrink-0"><p className="text-sm font-semibold text-gray-900">{formatPrice(order.total)}</p><StatusBadge status={order.order_status} /></div></Link>)}
          </div>
        </div>

        <div className="admin-card">
          <div className="px-4 sm:px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base"><BarChart3 className="w-4 h-4 text-gray-400" />{bn ? "ব্যবসার পালস" : "Business pulse"}</h2></div>
          <div className="p-4 sm:p-5 space-y-4">
            <div><p className="text-xs text-gray-500">{bn ? "লিড → জয় রূপান্তর" : "Lead → won conversion"}</p><p className="text-2xl font-bold text-gray-900 mt-1">{conversionRate == null ? "—" : `${conversionRate}%`}</p></div>
            <div><p className="text-xs text-gray-500">{bn ? "৩০ দিনে লিড" : "Leads in 30d"}</p><p className="text-lg font-semibold text-gray-900 mt-1">{analytics?.counts.leads ?? "—"}</p></div>
            <div><p className="text-xs text-gray-500">{bn ? "৩০ দিনে বুকিং" : "Bookings in 30d"}</p><p className="text-lg font-semibold text-gray-900 mt-1">{analytics?.counts.bookings ?? "—"}</p></div>
            <Link href="/sumon/analytics" className="block text-xs text-brand-600 hover:underline font-medium pt-1">{bn ? "বিস্তারিত অ্যানালিটিক্স →" : "Open analytics →"} </Link>
          </div>
        </div>
      </div>

      <DashboardOperationsPanel />

      <div className="admin-card">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base"><TrendingUp className="w-4 h-4 text-gray-400" />{bn ? "সাম্প্রতিক লিড" : "Recent Leads"}</h2><Link href="/sumon/leads" className="text-xs text-brand-600 hover:underline font-medium">{bn ? "সব দেখুন" : "View all"} →</Link></div>
        <div className="divide-y divide-gray-50 grid grid-cols-1 md:grid-cols-2">
          {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="px-5 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></div>) : stats?.recent_leads?.length === 0 ? <p className="px-5 py-10 text-center text-gray-400 text-sm md:col-span-2">{bn ? "এখনও কোনো লিড নেই" : "No leads yet"}</p> : stats?.recent_leads?.map((lead) => <Link key={lead.id} href="/sumon/leads" className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/80 transition-colors"><div className="min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p><p className="text-xs text-gray-400 truncate">{lead.phone} · {lead.lead_type.replace(/_/g, " ")}</p></div><StatusBadge status={lead.status} /></Link>)}
        </div>
      </div>
    </div>
  );
}
