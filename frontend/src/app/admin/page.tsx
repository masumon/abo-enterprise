"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShoppingCart, Briefcase, Users, Package,
  Clock, TrendingUp, AlertCircle, RefreshCw, DollarSign, Sparkles,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import api from "@/lib/api";
import StatsCard from "@/components/admin/StatsCard";
import StatusBadge from "@/components/admin/StatusBadge";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminQuickActions from "@/components/admin/AdminQuickActions";
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
  recent_orders: Array<{
    id: string; order_number: string; customer_name: string;
    total: number; order_status: string; created_at: string;
  }>;
  recent_leads: Array<{
    id: string; name: string; lead_type: string;
    phone: string; status: string; created_at: string;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [revenueTotal, setRevenueTotal] = useState<number | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const { lastUpdated, pendingOrders, pendingBookings, newLeads } = useAlertStore();
  const { lang } = useLanguageStore();
  const bn = lang === "bn";

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        adminApi.stats(),
        api.get("/api/v1/admin/analytics/overview?days=30").catch(() => null),
      ]);
      setStats(statsRes.data.data as Stats);
      const rev = analyticsRes?.data?.data?.revenue?.total;
      setRevenueTotal(typeof rev === "number" ? rev : null);
      const trend = analyticsRes?.data?.data?.trends?.revenue_pct;
      setRevenueTrend(typeof trend === "number" ? trend : null);
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
    badge:
      a.href === "/admin/orders" ? pendingOrders :
      a.href === "/admin/bookings" ? pendingBookings :
      a.href === "/admin/leads" ? newLeads : undefined,
  }));

  const h = new Date().getHours();
  const greetBn = h < 12 ? "সুপ্রভাত" : h < 17 ? "শুভ অপরাহ্ন" : "শুভ সন্ধ্যা";
  const greetEn = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`${greetEn}!`}
        titleBn={`${greetBn}!`}
        description="Business overview — orders, bookings, leads & revenue at a glance"
        descriptionBn="আপনার ব্যবসার সারাংশ — অর্ডার, বুকিং, লিড ও রিভেন্যু এক নজরে"
        actions={
          <div className="flex items-center gap-2">
            {updatedLabel && (
              <span className="text-xs text-gray-400 hidden sm:inline">{bn ? "আপডেট" : "Updated"} {updatedLabel}</span>
            )}
            <button
              onClick={() => fetchStats(true)}
              disabled={refreshing}
              className="admin-btn-secondary !py-2 !px-3"
              title={bn ? "রিফ্রেশ" : "Refresh"}
              aria-label={bn ? "রিফ্রেশ" : "Refresh"}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        }
      />

      {error && (
        <div role="alert" className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {bn ? "ড্যাশবোর্ড লোড হয়নি। রিফ্রেশ চাপুন।" : "Dashboard failed to load. Press refresh."}
        </div>
      )}

      {/* Quick actions */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-gray-700">{bn ? "দ্রুত কাজ" : "Quick Actions"}</h2>
        </div>
        <AdminQuickActions actions={quickActions} />
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {revenueTotal !== null && (
          <StatsCard
            title={bn ? "রেভিনিউ (৩০ দিন)" : "Revenue (30d)"}
            value={`৳${revenueTotal.toLocaleString()}`}
            sub={
              revenueTrend == null
                ? (bn ? "অর্ডার + বুকিং" : "orders + bookings")
                : `${revenueTrend >= 0 ? "▲" : "▼"} ${Math.abs(revenueTrend)}% ${bn ? "গত ৩০ দিনের তুলনায়" : "vs previous 30d"}`
            }
            icon={DollarSign}
            color="brand"
            loading={loading}
            href="/admin/analytics"
          />
        )}
        <StatsCard
          title={bn ? "অর্ডার" : "Orders"}
          value={stats?.total_orders ?? 0}
          sub={bn ? `${stats?.pending_orders ?? 0} অপেক্ষমান` : `${stats?.pending_orders ?? 0} pending`}
          icon={ShoppingCart}
          color="brand"
          loading={loading}
          alert={!!stats?.pending_orders}
          href="/admin/orders"
        />
        <StatsCard
          title={bn ? "বুকিং" : "Bookings"}
          value={stats?.total_bookings ?? 0}
          sub={bn ? `${stats?.pending_bookings ?? 0} অপেক্ষমান` : `${stats?.pending_bookings ?? 0} pending`}
          icon={Briefcase}
          color="accent"
          loading={loading}
          alert={!!stats?.pending_bookings}
          href="/admin/bookings"
        />
        <StatsCard
          title={bn ? "লিড" : "Leads"}
          value={stats?.total_leads ?? 0}
          sub={bn ? `${stats?.new_leads ?? 0} নতুন` : `${stats?.new_leads ?? 0} new`}
          icon={Users}
          color="green"
          loading={loading}
          alert={!!stats?.new_leads}
          href="/admin/leads"
        />
        <StatsCard
          title={bn ? "পণ্য" : "Products"}
          value={stats?.total_products ?? 0}
          sub={bn ? "সক্রিয়" : "active"}
          icon={Package}
          color="amber"
          loading={loading}
          href="/admin/products"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="admin-card">
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
              <Clock className="w-4 h-4 text-gray-400" />
              {bn ? "সাম্প্রতিক অর্ডার" : "Recent Orders"}
            </h2>
            <Link href="/admin/orders" className="text-xs text-brand-600 hover:underline font-medium">
              {bn ? "সব দেখুন" : "View all"} →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3 flex gap-3">
                  <div className="flex-1 h-4 bg-gray-100 rounded animate-pulse" />
                </div>
              ))
            ) : stats?.recent_orders?.length === 0 ? (
              <p className="px-5 py-10 text-center text-gray-400 text-sm">{bn ? "এখনও কোনো অর্ডার নেই" : "No orders yet"}</p>
            ) : (
              stats?.recent_orders?.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders?open=${order.id}`}
                  className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/80 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{order.customer_name}</p>
                    <p className="text-xs text-gray-400">{order.order_number}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{formatPrice(order.total)}</p>
                    <StatusBadge status={order.order_status} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="admin-card">
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              {bn ? "সাম্প্রতিক লিড" : "Recent Leads"}
            </h2>
            <Link href="/admin/leads" className="text-xs text-brand-600 hover:underline font-medium">
              {bn ? "সব দেখুন" : "View all"} →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></div>
              ))
            ) : stats?.recent_leads?.length === 0 ? (
              <p className="px-5 py-10 text-center text-gray-400 text-sm">{bn ? "এখনও কোনো লিড নেই" : "No leads yet"}</p>
            ) : (
              stats?.recent_leads?.map((lead) => (
                <Link
                  key={lead.id}
                  href="/admin/leads"
                  className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/80 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {lead.phone} · {lead.lead_type.replace(/_/g, " ")}
                    </p>
                  </div>
                  <StatusBadge status={lead.status} />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
