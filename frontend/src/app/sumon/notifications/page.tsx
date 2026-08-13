"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Loader2, X } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { notificationsApi, type NotificationRecord } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";

const SEVERITY_STYLE: Record<string, string> = {
  error: "bg-red-50 text-red-700",
  warning: "bg-amber-50 text-amber-700",
  info: "bg-brand-50 text-brand-700",
};

export default function AdminNotificationsPage() {
  const toast = useToastStore((s) => s.push);
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const PER_PAGE = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await notificationsApi.list({ page, per_page: PER_PAGE, unread_only: unreadOnly });
      const data = r.data.data ?? [];
      setItems(data);
      setTotal(r.data.meta?.total ?? data.length);
    } catch (err) {
      setItems([]);
      toast("error", apiErrorMessage(err, "Failed to load notifications"));
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly, toast]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) {
      toast("error", apiErrorMessage(err, "Failed to mark as read"));
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
      toast("error", apiErrorMessage(err, "Failed to dismiss"));
    }
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast("success", "All notifications marked as read");
    } catch (err) {
      toast("error", apiErrorMessage(err, "Failed to mark all as read"));
    }
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-6 max-w-4xl">
      <AdminPageHeader
        title="Notifications"
        titleBn="নোটিফিকেশন"
        description={`${total} total — payment failures, low stock, and other alerts that need attention`}
        descriptionBn={`${total}টি — পেমেন্ট ব্যর্থতা, কম স্টক এবং অন্যান্য সতর্কতা`}
        actions={
          <button type="button" onClick={markAllRead} className="btn btn-outline btn-sm gap-1.5">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        }
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setUnreadOnly(false); setPage(1); }}
          className={`btn btn-sm ${!unreadOnly ? "btn-brand" : "btn-outline"}`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => { setUnreadOnly(true); setPage(1); }}
          className={`btn btn-sm ${unreadOnly ? "btn-brand" : "btn-outline"}`}
        >
          Unread only
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : items.length === 0 ? (
        <div className="admin-card p-10 text-center text-gray-400">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
          {unreadOnly ? "No unread notifications" : "No notifications yet"}
        </div>
      ) : (
        <div className="admin-card divide-y divide-gray-50">
          {items.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 px-4 sm:px-5 py-3.5 ${!n.is_read ? "bg-brand-50/30" : ""}`}>
              <span className={`shrink-0 badge text-xs font-semibold ${SEVERITY_STYLE[n.severity] ?? SEVERITY_STYLE.info}`}>
                {n.severity}
              </span>
              <div className="min-w-0 flex-1">
                {n.link ? (
                  <Link href={n.link} onClick={() => !n.is_read && markRead(n.id)} className="font-medium text-gray-900 hover:text-brand-600 truncate block">
                    {n.title}
                  </Link>
                ) : (
                  <p className="font-medium text-gray-900 truncate">{n.title}</p>
                )}
                {n.body && <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.created_at).toLocaleString("en-BD", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {n.broadcast && " · Broadcast"}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!n.is_read && (
                  <button type="button" onClick={() => markRead(n.id)} className="btn btn-outline btn-sm" title="Mark as read">
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                <button type="button" onClick={() => setDismissTarget(n.id)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400" aria-label="Dismiss">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn btn-outline btn-sm">Previous</button>
          <span className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50 rounded-lg border border-gray-200">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn btn-outline btn-sm">Next</button>
        </div>
      )}

      <ConfirmDialog
        open={!!dismissTarget}
        title="Dismiss this notification?"
        message="It will be removed from this list. This can't be undone."
        confirmLabel="Dismiss"
        variant="warning"
        onConfirm={() => void performDismiss()}
        onCancel={() => setDismissTarget(null)}
      />
    </div>
  );
}
