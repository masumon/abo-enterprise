"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  TrendingUp, ShoppingCart, Calendar, AlertCircle, Users, FileText, Settings, ArrowRight,
} from "lucide-react";
import StatsCard from "@/components/admin/StatsCard";
import StatusBadge from "@/components/admin/StatusBadge";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface DashboardStats {
  total_orders: number;
  pending_orders: number;
  total_bookings: number;
  pending_bookings: number;
  new_leads: number;
  total_leads: number;
  total_products: number;
  recent_orders: any[];
  recent_leads: any[];
}

const QUICK_ACTIONS = [
  { href: "/admin/products",  icon: FileText,  label: "Products",  color: "bg-brand-50 hover:bg-brand-100 text-brand-600" },
  { href: "/admin/bookings",  icon: Calendar,  label: "Bookings",  color: "bg-green-50 hover:bg-green-100 text-green-600" },
  { href: "/admin/leads",     icon: Users,     label: "Leads",     color: "bg-purple-50 hover:bg-purple-100 text-purple-600" },
  { href: "/admin/settings",  icon: Settings,  label: "Settings",  color: "bg-amber-50 hover:bg-amber-100 text-amber-600" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      const response = await api.get("/api/v1/admin/stats");
      setStats(response.data.data);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Welcome back! Here&apos;s an overview of your business.
          </p>
        </div>
        <span className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-100 px-3 py-1.5 rounded-full font-semibold">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Live
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatsCard icon={ShoppingCart} title="Total Orders"    value={stats?.total_orders ?? 0}  sub={`${stats?.pending_orders ?? 0} pending`}   color="brand" />
        <StatsCard icon={Calendar}    title="Service Bookings" value={stats?.total_bookings ?? 0} sub={`${stats?.pending_bookings ?? 0} pending`} color="green" />
        <StatsCard icon={Users}       title="Leads"            value={stats?.total_leads ?? 0}    sub={`${stats?.new_leads ?? 0} new`}           color="accent" />
        <StatsCard icon={FileText}    title="Products"         value={stats?.total_products ?? 0} sub="In catalog"                               color="amber" />
        <StatsCard icon={AlertCircle} title="Action Items"     value={(stats?.pending_orders ?? 0) + (stats?.pending_bookings ?? 0)} sub="Require attention" color="accent" />
        <StatsCard icon={TrendingUp}  title="Revenue"          value="৳—"                         sub="This month"                               color="brand" />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Orders */}
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats?.recent_orders && stats.recent_orders.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {stats.recent_orders.slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{order.customer_name}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{order.order_number}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="font-bold text-gray-900 text-sm">৳{order.total?.toLocaleString("bn-BD")}</p>
                    <StatusBadge status={order.order_status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-6 text-center">No recent orders</p>
          )}
        </div>

        {/* Recent Leads */}
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900">Recent Leads</h2>
            <Link href="/admin/leads" className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats?.recent_leads && stats.recent_leads.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {stats.recent_leads.slice(0, 5).map((lead: any) => (
                <div key={lead.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{lead.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{lead.lead_type?.replace(/_/g, " ")}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="text-xs font-semibold text-gray-500">Score: {lead.qualification_score}</p>
                    <StatusBadge status={lead.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-6 text-center">No recent leads</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="admin-card p-6">
        <h2 className="text-base font-bold text-gray-900 mb-5">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map(({ href, icon: Icon, label, color }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-3 p-5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 group ${color}`}
            >
              <div className="w-12 h-12 bg-white/60 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <Icon className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-gray-800">{label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
