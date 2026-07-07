"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/api";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Copy, Check, Download, Mail, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { useToastStore } from "@/store/toast";
import { apiErrorMessage } from "@/lib/apiError";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export default function NewsletterAdminPage() {
  const [subscribers, setSubscribers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const toast = useToastStore((s) => s.push);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSettings();
      const settings = res.data.data as Record<string, string>;
      const raw = settings["newsletter_subscribers"] || "[]";
      try {
        const emails = JSON.parse(raw);
        setSubscribers(Array.isArray(emails) ? emails : []);
      } catch {
        setSubscribers([]);
      }
    } catch (err) {
      toast("error", apiErrorMessage(err, "Failed to load subscribers"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleCopyAll = () => {
    const text = subscribers.join("\n");
    navigator.clipboard.writeText(text);
    toast("success", "All emails copied to clipboard");
  };

  const handleDownloadCsv = () => {
    const csv = ["email", ...subscribers].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast("success", "CSV downloaded");
  };

  const handleRemoveEmail = async (email: string) => {
    const updated = subscribers.filter((e) => e !== email);
    try {
      await adminApi.updateSetting("newsletter_subscribers", {
        value: JSON.stringify(updated),
      });
      setSubscribers(updated);
      toast("success", "Subscriber removed");
    } catch (err) {
      toast("error", apiErrorMessage(err, "Failed to remove subscriber"));
    } finally {
      setRemoveTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Newsletter Subscribers"
        titleBn="নিউজলেটার সাবস্ক্রাইবার"
        description={`${subscribers.length} subscribers to your newsletter`}
      />

      {/* Stats & Actions */}
      <div className="grid sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Subscribers</p>
          <p className="text-3xl font-bold text-gray-900">{subscribers.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <button
            onClick={handleCopyAll}
            disabled={subscribers.length === 0}
            className="w-full text-left disabled:opacity-50"
          >
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Copy All</p>
            <p className="text-sm font-medium text-brand-600 hover:text-brand-700">{subscribers.length === 0 ? "No emails" : "Click to copy"}</p>
          </button>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <button
            onClick={handleDownloadCsv}
            disabled={subscribers.length === 0}
            className="w-full text-left disabled:opacity-50"
          >
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Export</p>
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-brand-600" />
              <p className="text-sm font-medium text-brand-600">CSV</p>
            </div>
          </button>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <button
            onClick={load}
            disabled={loading}
            className="w-full text-left disabled:opacity-50"
          >
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Refresh</p>
            <p className="text-sm font-medium text-gray-600 hover:text-gray-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Reload"}
            </p>
          </button>
        </div>
      </div>

      {/* Subscriber List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : subscribers.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No subscribers yet</h3>
          <p className="text-sm text-gray-600">Newsletter signup is enabled but no one has subscribed yet.</p>
          <p className="text-xs text-gray-500 mt-4">Subscribers will appear here as they sign up via the footer.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {subscribers.map((email) => (
              <div key={email} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <a href={`mailto:${email}`} className="text-sm font-medium text-gray-900 hover:text-brand-600 truncate">
                    {email}
                  </a>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleCopyEmail(email)}
                    className="p-1.5 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy email"
                  >
                    {copiedEmail === email ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                  <button
                    onClick={() => setRemoveTarget(email)}
                    className="p-1.5 rounded hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove subscriber"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Newsletter Management</h3>
            <p className="text-sm text-blue-800">
              Subscribers are collected via the footer signup. You can copy emails, export as CSV, or remove individual subscribers. Consider integrating with an email service provider (Mailchimp, SendGrid, etc.) for better management.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove Subscriber?"
        message={removeTarget ? `Remove ${removeTarget} from the newsletter list?` : ""}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => removeTarget && handleRemoveEmail(removeTarget)}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
