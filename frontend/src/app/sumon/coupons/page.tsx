"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Percent, Plus, Save, Trash2 } from "lucide-react";
import { couponsApi, type AdminCoupon } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

interface Coupon {
  id?: string;
  code: string;
  discount_percent: number;
  min_subtotal: number;
  active: boolean;
}

/** Bulk-edit table over the real coupons table (alembic/manual_sql 0023).
 *  Same UI as before; Save now diffs rows against what loaded and issues
 *  create/update/delete calls instead of overwriting one Settings blob. */
export default function AdminCouponsPage() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [original, setOriginal] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToastStore((s) => s.push);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await couponsApi.adminList();
      const list = res.data.data ?? [];
      setOriginal(list);
      setRows(
        list.map((c) => ({
          id: c.id,
          code: c.code,
          discount_percent: c.discount_percent,
          min_subtotal: c.min_subtotal,
          active: c.is_active,
        }))
      );
    } catch (err) {
      toast("error", apiErrorMessage(err, "Failed to load coupons"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const updateRow = (idx: number, patch: Partial<Coupon>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const addRow = () =>
    setRows((prev) => [...prev, { code: "", discount_percent: 10, min_subtotal: 0, active: true }]);

  const removeRow = (idx: number) =>
    setRows((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    const seen = new Set<string>();
    for (const r of rows) {
      const code = r.code.trim().toUpperCase();
      if (!code) {
        toast("error", "Every coupon needs a code");
        return;
      }
      if (seen.has(code)) {
        toast("error", `Duplicate code: ${code}`);
        return;
      }
      seen.add(code);
      if (r.discount_percent < 0 || r.discount_percent > 100) {
        toast("error", `${code}: discount must be 0–100%`);
        return;
      }
      if (r.min_subtotal < 0) {
        toast("error", `${code}: min subtotal can't be negative`);
        return;
      }
    }
    setSaving(true);
    try {
      const currentIds = new Set(rows.filter((r) => r.id).map((r) => r.id));
      const removed = original.filter((o) => !currentIds.has(o.id));
      await Promise.all(removed.map((o) => couponsApi.adminDelete(o.id)));

      await Promise.all(
        rows.map((r) => {
          const payload = {
            code: r.code.trim().toUpperCase(),
            discount_percent: Math.round(r.discount_percent),
            min_subtotal: Math.round(r.min_subtotal),
            is_active: r.active,
          };
          return r.id ? couponsApi.adminUpdate(r.id, payload) : couponsApi.adminCreate(payload);
        })
      );
      toast("success", `Saved ${rows.length} coupon${rows.length === 1 ? "" : "s"}`);
      await load();
    } catch (err) {
      toast("error", apiErrorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminPageHeader
        title="Coupons"
        titleBn="কুপন ম্যানেজার"
        description={`${rows.length} coupon${rows.length === 1 ? "" : "s"} — code, discount %, minimum order, active flag`}
      />

      <div className="admin-card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={addRow} className="admin-btn-secondary gap-1.5">
            <Plus className="w-4 h-4" />
            Add Coupon
          </button>
          <button onClick={save} disabled={saving} className="btn btn-brand btn-sm gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <AdminEmptyState
            icon={Percent}
            title="No coupons yet"
            description="Add a coupon to give customers a discount at checkout."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-premium table-responsive min-w-[560px]">
              <thead>
                <tr>
                  <th>Code</th>
                  <th className="w-32">Discount %</th>
                  <th className="w-40">Min Subtotal (৳)</th>
                  <th className="w-24">Active</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2" data-label="Code">
                      <input
                        value={r.code}
                        onChange={(e) => updateRow(i, { code: e.target.value.toUpperCase() })}
                        className="admin-input text-sm w-full uppercase font-mono"
                        placeholder="ABO10"
                      />
                    </td>
                    <td className="px-4 py-2" data-label="Discount %">
                      <input
                        type="number"
                        value={r.discount_percent}
                        onChange={(e) => updateRow(i, { discount_percent: Number(e.target.value) })}
                        min={0}
                        max={100}
                        className="admin-input text-sm w-full"
                      />
                    </td>
                    <td className="px-4 py-2" data-label="Min Subtotal (৳)">
                      <input
                        type="number"
                        value={r.min_subtotal}
                        onChange={(e) => updateRow(i, { min_subtotal: Number(e.target.value) })}
                        min={0}
                        className="admin-input text-sm w-full"
                      />
                    </td>
                    <td className="px-4 py-2" data-label="Active">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={r.active}
                          onChange={(e) => updateRow(i, { active: e.target.checked })}
                          className="w-4 h-4 accent-brand-600"
                        />
                        <span className="text-xs text-muted">{r.active ? "On" : "Off"}</span>
                      </label>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => removeRow(i)}
                        className="text-gray-400 hover:text-red-500 p-1"
                        aria-label={`Remove ${r.code || "coupon"}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
