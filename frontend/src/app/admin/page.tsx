"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart, Briefcase, Users, Package, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { adminApi } from "@/lib/api";
import StatsCard from "@/components/admin/StatsCard";
import StatusBadge from "@/components/admin/StatusBadge";
import { formatPrice } from "@/lib/utils";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    adminApi.stats()
      .then((r) => {
        setStats(r.data.data as Stats);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">ABO Enterprise — Admin Overview</p>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Failed to load dashboard stats. Please refresh the page.
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Orders"
          value={stats?.total_orders ?? 0}
          sub={`${stats?.pending_orders ?? 0} pending`}
          icon={ShoppingCart}
          color="brand"
          loading={loading}
        />
        <StatsCard
          title="Service Bookings"
          value={stats?.total_bookings ?? 0}
          sub={`${stats?.pending_bookings ?? 0} pending`}
          icon={Briefcase}
          color="accent"
          loading={loading}
        />
        <StatsCard
          title="Project Leads"
          value={stats?.total_leads ?? 0}
          sub={`${stats?.new_leads ?? 0} new`}
          icon={Users}
          color="green"
          loading={loading}
        />
        <StatsCard
          title="Products"
          value={stats?.total_products ?? 0}
          sub="active"
          icon={Package}
          color="amber"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              Recent Orders
            </h2>
            <Link href="/admin/orders" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 h-4 bg-gray-100 rounded animate-pulse" />
                  <div className="w-16 h-4 bg-gray-100 rounded animate-pulse" />
                </div>
              ))
            ) : stats?.recent_orders?.length === 0 ? (
              <p className="px-5 py-8 text-center text-gray-400 text-sm">No orders yet</p>
            ) : (
              stats?.recent_orders?.map((order) => (
                <div key={order.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{order.customer_name}</p>
                    <p className="text-xs text-gray-400">{order.order_number}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{formatPrice(order.total)}</p>
                    <StatusBadge status={order.order_status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              Recent Leads
            </h2>
            <Link href="/admin/leads" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 h-4 bg-gray-100 rounded animate-pulse" />
                  <div className="w-16 h-4 bg-gray-100 rounded animate-pulse" />
                </div>
              ))
            ) : stats?.recent_leads?.length === 0 ? (
              <p className="px-5 py-8 text-center text-gray-400 text-sm">No leads yet</p>
            ) : (
              stats?.recent_leads?.map((lead) => (
                <div key={lead.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p>
                    <p className="text-xs text-gray-400">{lead.phone} · {lead.lead_type.replace(/_/g, " ")}</p>
                  </div>
                  <StatusBadge status={lead.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
