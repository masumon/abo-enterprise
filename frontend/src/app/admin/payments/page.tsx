"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight,
  CreditCard, Check, AlertCircle,
} from "lucide-react";
import { paymentMethodsAdminApi, type PaymentMethodRecord } from "@/lib/api";
import { useToastStore } from "@/store/toast";
import { cn } from "@/lib/utils";

const GATEWAY_LABELS: Record<string, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  bank: "Bank Transfer",
  cod: "Cash on Delivery",
  sslcommerz: "SSLCommerz",
  upay: "Upay",
  tap: "TAP",
};

const GATEWAY_COLORS: Record<string, string> = {
  bkash: "#E2136E",
  nagad: "#F05A28",
  rocket: "#8B1FA8",
  bank: "#1E5BA8",
  cod: "#059669",
  sslcommerz: "#2E7D32",
  upay: "#0A84FF",
  tap: "#FF6B35",
};

const GATEWAY_ICONS: Record<string, string> = {
  bkash: "৳",
  nagad: "৳",
  rocket: "৳",
  bank: "🏦",
  cod: "💵",
  sslcommerz: "🔒",
  upay: "৳",
  tap: "৳",
};

const DEFAULT_GATEWAYS = ["bkash", "nagad", "rocket", "bank", "cod"];

const EMPTY_FORM: Partial<PaymentMethodRecord> = {
  payment_gateway: "",
  is_active: true,
  account_identifier: "",
  commission_percentage: 0,
  min_amount: null,
  max_amount: null,
  description: "",
  sort_order: 0,
};

export default function AdminPaymentsPage() {
  const [methods, setMethods] = useState<PaymentMethodRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<PaymentMethodRecord> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToastStore((s) => s.push);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await paymentMethodsAdminApi.list();
      setMethods((r.data.data ?? []) as PaymentMethodRecord[]);
    } catch {
      toast("error", "Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openNew = (gateway?: string) => {
    setEditing({ ...EMPTY_FORM, payment_gateway: gateway ?? "" });
    setIsNew(true);
  };

  const openEdit = (m: PaymentMethodRecord) => {
    setEditing({ ...m });
    setIsNew(false);
  };

  const closePanel = () => { setEditing(null); setIsNew(false); };

  const handleToggle = async (m: PaymentMethodRecord) => {
    setTogglingId(m.id);
    try {
      await paymentMethodsAdminApi.update(m.id, { is_active: !m.is_active });
      await load();
    } catch {
      toast("error", "Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this payment method? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await paymentMethodsAdminApi.delete(id);
      toast("success", "Payment method deleted");
      await load();
    } catch {
      toast("error", "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.payment_gateway?.trim()) { toast("error", "Gateway name is required"); return; }

    setSaving(true);
    try {
      const payload = {
        payment_gateway: editing.payment_gateway!,
        is_active: editing.is_active ?? true,
        account_identifier: editing.account_identifier || null,
        commission_percentage: editing.commission_percentage ?? 0,
        min_amount: editing.min_amount ?? null,
        max_amount: editing.max_amount ?? null,
        description: editing.description || null,
        sort_order: editing.sort_order ?? 0,
      };

      if (isNew) {
        await paymentMethodsAdminApi.create(payload);
        toast("success", "Payment method added");
      } else {
        await paymentMethodsAdminApi.update(editing.id!, payload);
        toast("success", "Payment method updated");
      }
      closePanel();
      await load();
    } catch {
      toast("error", isNew ? "Failed to add" : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const configured = new Set(methods.map((m) => m.payment_gateway));

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Gateways</h1>
          <p className="text-gray-500 text-sm mt-1">Configure which payment methods are available at checkout</p>
        </div>
        <button onClick={() => openNew()} className="btn btn-primary btn-sm gap-1.5">
          <Plus className="w-4 h-4" /> Add Gateway
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Quick-add unconfigured defaults */}
          {DEFAULT_GATEWAYS.some((g) => !configured.has(g)) && (
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-3">Quick Add Common Gateways</p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_GATEWAYS.filter((g) => !configured.has(g)).map((g) => (
                  <button
                    key={g}
                    onClick={() => openNew(g)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-brand-200 rounded-lg text-sm text-brand-700 hover:bg-brand-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {GATEWAY_LABELS[g] ?? g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Gateway cards */}
          {methods.length === 0 ? (
            <div className="admin-card p-12 text-center">
              <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No payment gateways configured</p>
              <p className="text-gray-400 text-sm mt-1">Add a gateway to enable payments at checkout</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {methods.map((m) => {
                const color = GATEWAY_COLORS[m.payment_gateway] ?? "#6B7280";
                const label = GATEWAY_LABELS[m.payment_gateway] ?? m.payment_gateway;
                const icon = GATEWAY_ICONS[m.payment_gateway] ?? "💳";
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "bg-white rounded-2xl border p-5 transition-all",
                      m.is_active ? "border-gray-100 shadow-sm" : "border-gray-200 opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                          style={{ backgroundColor: color }}
                        >
                          {icon}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{label}</p>
                          <p className="text-xs text-gray-400 font-mono">{m.payment_gateway}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEdit(m)}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          disabled={deletingId === m.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          {deletingId === m.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                        <button
                          onClick={() => handleToggle(m)}
                          disabled={togglingId === m.id}
                          className="ml-1 text-gray-400 hover:text-brand-600 transition-colors"
                        >
                          {togglingId === m.id
                            ? <Loader2 className="w-5 h-5 animate-spin" />
                            : m.is_active
                              ? <ToggleRight className="w-6 h-6 text-green-500" />
                              : <ToggleLeft className="w-6 h-6" />
                          }
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-gray-500">
                      {m.account_identifier && (
                        <p><span className="text-gray-400">Account:</span> {m.account_identifier}</p>
                      )}
                      {m.commission_percentage > 0 && (
                        <p><span className="text-gray-400">Commission:</span> {m.commission_percentage}%</p>
                      )}
                      {(m.min_amount != null || m.max_amount != null) && (
                        <p>
                          <span className="text-gray-400">Range:</span>{" "}
                          {m.min_amount != null ? `৳${m.min_amount}` : "—"} – {m.max_amount != null ? `৳${m.max_amount}` : "—"}
                        </p>
                      )}
                      {m.description && <p className="text-gray-400 truncate">{m.description}</p>}
                    </div>

                    <div className="mt-3 flex items-center gap-1.5">
                      {m.is_active
                        ? <><Check className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-600 font-medium">Active at checkout</span></>
                        : <><AlertCircle className="w-3.5 h-3.5 text-gray-400" /><span className="text-xs text-gray-400">Disabled</span></>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* SSLCommerz Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">SSLCommerz Integration</p>
        <p className="text-sm text-blue-600">
          Add a gateway with name <code className="bg-blue-100 px-1 rounded font-mono">sslcommerz</code> and put your Store ID in the Account Identifier field.
          Set API keys and sandbox/live mode via Render environment variables: <code className="bg-blue-100 px-1 rounded font-mono">SSLCOMMERZ_STORE_ID</code>,{" "}
          <code className="bg-blue-100 px-1 rounded font-mono">SSLCOMMERZ_STORE_PASS</code>, <code className="bg-blue-100 px-1 rounded font-mono">SSLCOMMERZ_SANDBOX</code>.
        </p>
      </div>

      {/* Edit/Create Panel */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="ml-auto w-full max-w-md h-full flex flex-col bg-white shadow-2xl animate-slide-in-right overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">
                {isNew ? "Add Payment Gateway" : `Edit ${GATEWAY_LABELS[editing.payment_gateway ?? ""] ?? editing.payment_gateway}`}
              </h2>
              <button onClick={closePanel} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Gateway ID <span className="text-red-400">*</span>
                </label>
                {isNew ? (
                  <input
                    value={editing.payment_gateway ?? ""}
                    onChange={(e) => setEditing((p) => p ? { ...p, payment_gateway: e.target.value.toLowerCase().replace(/\s+/g, "_") } : p)}
                    placeholder="e.g. bkash, nagad, sslcommerz"
                    className="input w-full font-mono text-sm"
                  />
                ) : (
                  <div className="input w-full bg-gray-50 text-gray-500 font-mono text-sm">{editing.payment_gateway}</div>
                )}
                <p className="text-xs text-gray-400 mt-1">Lowercase identifier used in code. Cannot be changed after creation.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Account Identifier
                </label>
                <input
                  value={editing.account_identifier ?? ""}
                  onChange={(e) => setEditing((p) => p ? { ...p, account_identifier: e.target.value } : p)}
                  placeholder="Phone number, Store ID, account no..."
                  className="input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Commission %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={editing.commission_percentage ?? 0}
                    onChange={(e) => setEditing((p) => p ? { ...p, commission_percentage: parseFloat(e.target.value) || 0 } : p)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sort Order</label>
                  <input
                    type="number"
                    value={editing.sort_order ?? 0}
                    onChange={(e) => setEditing((p) => p ? { ...p, sort_order: parseInt(e.target.value) || 0 } : p)}
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Min Amount (৳)</label>
                  <input
                    type="number"
                    value={editing.min_amount ?? ""}
                    onChange={(e) => setEditing((p) => p ? { ...p, min_amount: e.target.value ? parseFloat(e.target.value) : null } : p)}
                    placeholder="No limit"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Max Amount (৳)</label>
                  <input
                    type="number"
                    value={editing.max_amount ?? ""}
                    onChange={(e) => setEditing((p) => p ? { ...p, max_amount: e.target.value ? parseFloat(e.target.value) : null } : p)}
                    placeholder="No limit"
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description / Notes</label>
                <textarea
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing((p) => p ? { ...p, description: e.target.value } : p)}
                  rows={2}
                  placeholder="Optional note for admins..."
                  className="input w-full resize-none text-sm"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={!!editing.is_active}
                    onChange={(e) => setEditing((p) => p ? { ...p, is_active: e.target.checked } : p)}
                  />
                  <div className={`w-10 h-6 rounded-full transition-colors ${editing.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${editing.is_active ? "translate-x-5" : "translate-x-1"}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">Active at checkout</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={closePanel} className="btn btn-outline btn-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {isNew ? "Add Gateway" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
