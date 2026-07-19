"use client";

import { useEffect, useState } from "react";
import { X, Send, Loader2, Mail } from "lucide-react";
import { adminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Recipient email (customer). */
  to: string;
  /** Prefilled subject (e.g. "Regarding your order ABO-…"). */
  defaultSubject?: string;
  /** Optional context hint shown under the title (e.g. the order number). */
  contextLabel?: string;
}

/**
 * Admin composes a free-text email to a customer. It is sent server-side from
 * the business no-reply address (POST /admin/email/send), not via a mailto —
 * so the customer receives it from ABO Enterprise. Reused across Orders,
 * Bookings and Leads.
 */
export default function ComposeEmailModal({ open, onClose, to, defaultSubject = "", contextLabel }: Props) {
  const toast = useToastStore((s) => s.push);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setSubject(defaultSubject);
      setMessage("");
    }
  }, [open, defaultSubject]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast("error", "Subject and message are required");
      return;
    }
    setSending(true);
    try {
      const r = await adminApi.sendEmail({ to, subject: subject.trim(), message: message.trim() });
      toast("success", r?.data?.message || "Email sent");
      onClose();
    } catch (err) {
      toast("error", apiErrorMessage(err, "Failed to send email"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Compose email"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Send Email</h3>
              {contextLabel && <p className="text-xs text-gray-400 truncate">{contextLabel}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-3">
          <div>
            <label className="form-label">To</label>
            <input value={to} readOnly className="input bg-gray-50 dark:bg-white/5 text-gray-500" />
          </div>
          <div>
            <label className="form-label" htmlFor="compose-subject">Subject</label>
            <input
              id="compose-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="input"
              required
            />
          </div>
          <div>
            <label className="form-label" htmlFor="compose-message">Message</label>
            <textarea
              id="compose-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message to the customer…"
              rows={6}
              className="input resize-none"
              required
            />
          </div>
          <p className="text-[11px] text-gray-400">
            Sent from ABO Enterprise (no-reply@aboenterprise.com) to the customer.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Cancel</button>
            <button type="submit" disabled={sending} className="btn btn-brand btn-sm disabled:opacity-60">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
