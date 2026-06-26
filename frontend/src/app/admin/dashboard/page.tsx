"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  TrendingUp,
  ShoppingCart,
  Calendar,
  AlertCircle,
  Users,
  FileText,
} from "lucide-react";
import StatsCard from "@/components/admin/StatsCard";
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

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      const response = await api.get("/api/v1/admin/stats");
      setStats(response.data.data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Here's an overview of your business.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatsCard
          icon={ShoppingCart}
          label="Total Orders"
          value={stats?.total_orders || 0}
          subtext={`${stats?.pending_orders || 0} pending`}
          color="brand"
        />

        <StatsCard
          icon={Calendar}
          label="Service Bookings"
          value={stats?.total_bookings || 0}
          subtext={`${stats?.pending_bookings || 0} pending`}
          color="green"
        />

        <StatsCard
          icon={Users}
          label="Leads"
          value={stats?.total_leads || 0}
          subtext={`${stats?.new_leads || 0} new`}
          color="accent"
        />

        <StatsCard
          icon={FileText}
          label="Products"
          value={stats?.total_products || 0}
          subtext="In catalog"
          color="amber"
        />

        <StatsCard
          icon={AlertCircle}
          label="Action Items"
          value={(stats?.pending_orders || 0) + (stats?.pending_bookings || 0)}
          subtext="Require attention"
          color="accent"
        />

        <StatsCard
          icon={TrendingUp}
          label="Revenue"
          value="৳0"
          subtext="This month"
          color="brand"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Orders</h2>

          {stats?.recent_orders && stats.recent_orders.length > 0 ? (
            <div className="space-y-4">
              {stats.recent_orders.slice(0, 5).map((order: any) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-3 border-b last:border-b-0"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {order.customer_name}
                    </p>
                    <p className="text-sm text-gray-600">{order.order_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ৳{order.total?.toLocaleString()}
                    </p>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        order.order_status === "completed"
                          ? "bg-green-100 text-green-700"
                          : order.order_status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {order.order_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent orders</p>
          )}

          <a
            href="/admin/orders"
            className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-semibold text-sm"
          >
            View all orders →
          </a>
        </div>

        {/* Recent Leads */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Leads</h2>

          {stats?.recent_leads && stats.recent_leads.length > 0 ? (
            <div className="space-y-4">
              {stats.recent_leads.slice(0, 5).map((lead: any) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between py-3 border-b last:border-b-0"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{lead.name}</p>
                    <p className="text-sm text-gray-600">{lead.lead_type}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      Score: {lead.qualification_score}
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        lead.qualification_score >= 70
                          ? "bg-green-100 text-green-700"
                          : lead.qualification_score >= 50
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {lead.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent leads</p>
          )}

          <a
            href="/admin/leads"
            className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-semibold text-sm"
          >
            View all leads →
          </a>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/admin/products"
            className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition text-center"
          >
            <FileText className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900">
              Manage Products
            </p>
          </a>
          <a
            href="/admin/bookings"
            className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition text-center"
          >
            <Calendar className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900">Bookings</p>
          </a>
          <a
            href="/admin/leads"
            className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition text-center"
          >
            <Users className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900">
              Manage Leads
            </p>
          </a>
          <a
            href="/admin/settings"
            className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition text-center"
          >
            <TrendingUp className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900">Settings</p>
          </a>
        </div>
      </div>
    </div>
  );
}
