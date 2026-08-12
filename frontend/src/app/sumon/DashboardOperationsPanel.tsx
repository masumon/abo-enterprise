"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Clock, XCircle } from "lucide-react";
import api from "@/lib/api";
import { useLanguageStore } from "@/store/language";
import { formatPrice } from "@/lib/utils";

interface AnalyticsOverview {
  revenue: { total: number; orders: number; bookings: number };
  counts: { orders: number; bookings: number; leads: number; leads_won: number };
  top_services: Array<{ service_id: string; name: string; name_bn: string; count: number; revenue: number }>;
}

interface OpsErrors {
  failed_payments: Array<{ order_number: string; customer: string; total: number; at: string }>;
  failed_emails: Array<{ at: string; [key: string]: unknown }>;
}

interface NotificationItem {
  severity: "error" | "warning" | "info";
  kind: string;
  at: string;
  text: string;
}

interface OpsNotifications {
  items: NotificationItem[];
  counts: { error: number; warning: number; info: number };
}

interface HealthCheck {
  ok: boolean;
  [key: string]: unknown;
}

interface HealthData {
  checks: Record<string, HealthCheck>;
  healthy: number;
  total: number;
}

interface CustomerMetrics {
  period_days: number;
  new_customers: number;
  returning_customers: number;
  active_customers: number;
  top_products: Array<{ product: string; orders: number; revenue: number }>;
}

export default function DashboardOperationsPanel() {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const [last24h, setLast24h] = useState<AnalyticsOverview | null>(null);
  const [last7d, setLast7d] = useState<AnalyticsOverview | null>(null);
  const [ops, setOps] = useState<OpsErrors | null>(null);
  const [notifications, setNotifications] = useState<OpsNotifications | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [customerMetrics, setCustomerMetrics] = useState<CustomerMetrics | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/api/v1/admin/analytics/overview?days=1").catch(() => null),
      api.get("/api/v1/admin/analytics/overview?days=7").catch(() => null),
      api.get("/api/v1/admin/ops/errors").catch(() => null),
      api.get("/api/v1/admin/ops/notifications").catch(() => null),
      api.get("/api/v1/admin/ops/health").catch(() => null),
      api.get("/api/v1/admin/customer-metrics?days=30").catch(() => null),
    ]).then(([dayRes, weekRes, opsRes, notificationRes, healthRes, customerRes]) => {
      if (!active) return;
      setLast24h((dayRes?.data?.data ?? null) as AnalyticsOverview | null);
      setLast7d((weekRes?.data?.data ?? null) as AnalyticsOverview | null);
      setOps((opsRes?.data?.data ?? null) as OpsErrors | null);
      setNotifications((notificationRes?.data?.data ?? null) as OpsNotifications | null);
      setHealth((healthRes?.data?.data ?? null) as HealthData | null);
      setCustomerMetrics((customerRes?.data?.data ?? null) as CustomerMetrics | null);
    });
    return () => { active = false; };
  }, []);

  const healthFailed = health ? health.total - health.healthy : null;
  const failedPayments = ops?.failed_payments?.length ?? null;
  const failedEmails = ops?.failed_emails?.length ?? null;
  const attentionItems = notifications?.items?.slice(0, 5) ?? [];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-brand-500" />
        <h2 className="text-sm font-semibold text-gray-700">{bn ? "অপারেশন ও ব্যবসার অবস্থা" : "Operations & business status"}</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="admin-card p-4">
          <p className="text-xs text-gray-500">{bn ? "গত ২৪ ঘণ্টার রেভিনিউ" : "Revenue · last 24h"}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{last24h ? formatPrice(last24h.revenue.total) : "—"}</p>
          <p className="text-xs text-gray-400 mt-1">{last24h ? `${last24h.counts.orders} ${bn ? "অর্ডার" : "orders"} · ${last24h.counts.bookings} ${bn ? "বুকিং" : "bookings"}` : ""}</p>
        </div>
        <div className="admin-card p-4">
          <p className="text-xs text-gray-500">{bn ? "গত ৭ দিনের রেভিনিউ" : "Revenue · last 7d"}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{last7d ? formatPrice(last7d.revenue.total) : "—"}</p>
          <p className="text-xs text-gray-400 mt-1">{last7d ? `${last7d.counts.orders} ${bn ? "অর্ডার" : "orders"} · ${last7d.counts.bookings} ${bn ? "বুকিং" : "bookings"}` : ""}</p>
        </div>
        <div className="admin-card p-4">
          <p className="text-xs text-gray-500">{bn ? "পেমেন্ট সমস্যা" : "Payment failures"}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{failedPayments ?? "—"}</p>
          <Link href="/sumon/payments" className="text-xs text-brand-600 hover:underline">{bn ? "পেমেন্ট দেখুন →" : "Review payments →"}</Link>
        </div>
        <div className="admin-card p-4">
          <p className="text-xs text-gray-500">{bn ? "ইমেইল সমস্যা" : "Email failures"}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{failedEmails ?? "—"}</p>
          <Link href="/sumon/analytics" className="text-xs text-brand-600 hover:underline">{bn ? "অপারেশন দেখুন →" : "Open operations →"}</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="admin-card p-4">
          <p className="text-xs text-gray-500">{bn ? "নতুন গ্রাহক · ৩০ দিন" : "New customers · 30d"}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{customerMetrics ? customerMetrics.new_customers : "—"}</p>
          <p className="text-xs text-gray-400 mt-1">{customerMetrics ? `${customerMetrics.active_customers} ${bn ? "সক্রিয় গ্রাহক" : "active customers"}` : ""}</p>
        </div>
        <div className="admin-card p-4">
          <p className="text-xs text-gray-500">{bn ? "ফিরতি গ্রাহক · ৩০ দিন" : "Returning customers · 30d"}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{customerMetrics ? customerMetrics.returning_customers : "—"}</p>
          <Link href="/sumon/customers" className="text-xs text-brand-600 hover:underline">{bn ? "গ্রাহক দেখুন →" : "View customers →"}</Link>
        </div>
        <div className="admin-card p-4">
          <p className="text-xs text-gray-500">{bn ? "শীর্ষ পণ্য · ৩০ দিন" : "Top products · 30d"}</p>
          {customerMetrics === null ? (
            <p className="text-sm text-amber-600 mt-2">{bn ? "পণ্যের ডেটা পাওয়া যায়নি" : "Product data is unavailable"}</p>
          ) : customerMetrics.top_products.length === 0 ? (
            <p className="text-sm text-gray-400 mt-2">{bn ? "ডেটা নেই" : "No product data"}</p>
          ) : (
            <div className="mt-2 space-y-1">
              {customerMetrics.top_products.slice(0, 3).map((product) => (
                <div key={product.product} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-700 truncate">{product.product}</span>
                  <span className="text-xs font-semibold text-gray-900 shrink-0">{formatPrice(product.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="admin-card lg:col-span-2">
          <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-gray-400" />{bn ? "মনোযোগ প্রয়োজন" : "Needs attention"}</h3>
            <Link href="/sumon/analytics" className="text-xs text-brand-600 hover:underline">{bn ? "বিস্তারিত →" : "Details →"}</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {notifications === null ? (
              <p className="px-5 py-8 text-center text-sm text-amber-600">{bn ? "অপারেশনাল সতর্কতার তথ্য পাওয়া যায়নি" : "Operational alert data is unavailable"}</p>
            ) : attentionItems.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">{bn ? "বর্তমানে কোনো অপারেশনাল সতর্কতা নেই" : "No current operational alerts"}</p>
            ) : attentionItems.map((item, index) => (
              <div key={`${item.kind}-${item.at}-${index}`} className="px-4 sm:px-5 py-3 flex items-start gap-3">
                {item.severity === "error" ? <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" aria-hidden="true" /> : item.severity === "warning" ? <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" aria-hidden="true" />}
                <p className="text-sm text-gray-700 min-w-0">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card">
          <div className="px-4 sm:px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm"><BarChart3 className="w-4 h-4 text-gray-400" aria-hidden="true" />{bn ? "শীর্ষ সার্ভিস (৭ দিন)" : "Top services · 7d"}</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {last7d === null ? (
              <p className="px-5 py-8 text-center text-sm text-amber-600">{bn ? "সার্ভিস ডেটা পাওয়া যায়নি" : "Service data is unavailable"}</p>
            ) : last7d.top_services?.length ? last7d.top_services.map((service) => (
              <div key={service.service_id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{bn ? service.name_bn || service.name : service.name}</p><p className="text-xs text-gray-400">{service.count} {bn ? "বুকিং" : "bookings"}</p></div>
                <span className="text-sm font-semibold text-gray-900 shrink-0">{formatPrice(service.revenue)}</span>
              </div>
            )) : <p className="px-5 py-8 text-center text-sm text-gray-400">{bn ? "ডেটা নেই" : "No service data"}</p>}
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm"><Activity className="w-4 h-4 text-gray-400" aria-hidden="true" />{bn ? "সিস্টেম হেলথ" : "System health"}</h3>
          <Link href="/sumon/analytics" className="text-xs text-brand-600 hover:underline">{bn ? "মনিটরিং →" : "Monitoring →"}</Link>
        </div>
        <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="rounded-lg border border-gray-100 p-3"><p className="text-xs text-gray-500">{bn ? "সামগ্রিক" : "Overall"}</p><p className="text-lg font-bold text-gray-900 mt-1">{health ? `${health.healthy}/${health.total}` : "—"}</p></div>
          <div className="rounded-lg border border-gray-100 p-3"><p className="text-xs text-gray-500">API</p><p className="text-lg font-bold text-gray-900 mt-1">{health ? (health.checks.api?.ok ? "OK" : "Fail") : "—"}</p></div>
          <div className="rounded-lg border border-gray-100 p-3"><p className="text-xs text-gray-500">DB</p><p className="text-lg font-bold text-gray-900 mt-1">{health ? (health.checks.database?.ok ? "OK" : "Fail") : "—"}</p></div>
          <div className="rounded-lg border border-gray-100 p-3"><p className="text-xs text-gray-500">{bn ? "ইমেইল" : "Email"}</p><p className="text-lg font-bold text-gray-900 mt-1">{health ? (health.checks.smtp?.ok ? "OK" : "Fail") : "—"}</p></div>
          <div className="rounded-lg border border-gray-100 p-3"><p className="text-xs text-gray-500">GA4</p><p className="text-lg font-bold text-gray-900 mt-1">{health ? (health.checks.ga4?.ok ? "OK" : "Fail") : "—"}</p></div>
          <div className="rounded-lg border border-gray-100 p-3"><p className="text-xs text-gray-500">{bn ? "ব্যর্থ চেক" : "Failed checks"}</p><p className="text-lg font-bold text-gray-900 mt-1">{healthFailed ?? "—"}</p></div>
        </div>
      </div>
    </section>
  );
}
