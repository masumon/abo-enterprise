"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, X, Truck } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { deliveryZonesApi, type DeliveryZone } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";

interface Form {
  id?: string;
  name_en: string; name_bn: string;
  districts: string; upazilas: string;
  charge: string; free_threshold: string;
  is_active: boolean; sort_order: string;
}
const EMPTY: Form = {
  name_en: "", name_bn: "", districts: "", upazilas: "",
  charge: "", free_threshold: "", is_active: true, sort_order: "0",
};

const splitList = (s: string): string[] =>
  s.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);

export default function AdminDeliveryZonesPage() {
  const toast = useToastStore((s) => s.push);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [delId, setDelId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await deliveryZonesApi.adminList();
      setZones(r.data.data ?? []);
    } catch (e) {
      toast("error", apiErrorMessage(e, "লোড করা যায়নি"));
    } finally {
      setLoading(false);
    }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const openNew = () => { setForm(EMPTY); setOpen(true); };
  const openEdit = (z: DeliveryZone) => {
    setForm({
      id: z.id, name_en: z.name_en, name_bn: z.name_bn,
      districts: (z.districts ?? []).join(", "),
      upazilas: (z.upazilas ?? []).join(", "),
      charge: String(z.charge ?? ""),
      free_threshold: z.free_threshold != null ? String(z.free_threshold) : "",
      is_active: z.is_active, sort_order: String(z.sort_order ?? 0),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name_en.trim() || !form.name_bn.trim()) { toast("error", "জোনের নাম (EN ও BN) দিন"); return; }
    const districts = splitList(form.districts);
    if (districts.length === 0) { toast("error", "অন্তত একটি জেলা দিন"); return; }
    setSaving(true);
    const payload: Partial<DeliveryZone> = {
      name_en: form.name_en.trim(), name_bn: form.name_bn.trim(),
      districts, upazilas: splitList(form.upazilas),
      charge: Number(form.charge) || 0,
      free_threshold: form.free_threshold ? Number(form.free_threshold) : null,
      is_active: form.is_active, sort_order: Number(form.sort_order) || 0,
    };
    try {
      if (form.id) await deliveryZonesApi.update(form.id, payload);
      else await deliveryZonesApi.create(payload);
      toast("success", form.id ? "জোন আপডেট হয়েছে" : "জোন তৈরি হয়েছে");
      setOpen(false);
      load();
    } catch (e) {
      toast("error", apiErrorMessage(e, "সেভ করা যায়নি"));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!delId) return;
    try {
      await deliveryZonesApi.delete(delId);
      toast("success", "জোন মুছে ফেলা হয়েছে");
      setZones((zs) => zs.filter((z) => z.id !== delId));
    } catch (e) {
      toast("error", apiErrorMessage(e, "মুছে ফেলা যায়নি"));
    } finally {
      setDelId(null);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Delivery Zones"
        titleBn="ডেলিভারি জোন"
        description="Set delivery charge & free-delivery threshold for any districts/upazilas. No matching zone → the legacy Checkout & Delivery charges apply."
        descriptionBn="যেকোনো জেলা/উপজেলার জন্য চার্জ ও ফ্রি-থ্রেশহোল্ড দিন। কোনো জোন না মিললে আগের Checkout & Delivery চার্জ প্রযোজ্য হবে।"
        actions={<button type="button" onClick={openNew} className="btn btn-brand btn-sm"><Plus className="w-4 h-4" /> নতুন জোন</button>}
      />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
      ) : zones.length === 0 ? (
        <div className="enterprise-card p-10 text-center text-muted">
          <Truck className="w-8 h-8 mx-auto mb-3 text-brand-400" />
          কোনো জোন নেই। “নতুন জোন” দিয়ে শুরু করুন। (এখন আগের ৩-স্তর চার্জ চলছে।)
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((z) => (
            <div key={z.id} className="enterprise-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-heading truncate">{z.name_bn || z.name_en}</p>
                  <p className="text-xs text-muted mt-0.5 line-clamp-2">{(z.districts ?? []).join(", ")}</p>
                </div>
                {!z.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-muted flex-shrink-0">নিষ্ক্রিয়</span>}
              </div>
              <p className="text-sm text-heading mt-2">চার্জ: <b>৳{z.charge}</b>{z.free_threshold ? ` · ফ্রি ৳${z.free_threshold}+` : ""}</p>
              {z.upazilas?.length > 0 && <p className="text-[11px] text-muted mt-0.5">উপজেলা: {z.upazilas.join(", ")}</p>}
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => openEdit(z)} className="btn btn-outline btn-sm flex-1"><Pencil className="w-3.5 h-3.5" /> এডিট</button>
                <button type="button" onClick={() => setDelId(z.id)} className="btn btn-outline btn-sm text-red-600 border-red-200"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="w-full max-w-lg my-8 rounded-2xl bg-white dark:bg-[var(--surface-card)] shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)]">
              <h2 className="font-bold text-heading">{form.id ? "জোন এডিট" : "নতুন জোন"}</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">নাম (EN) *</label><input className="input" value={form.name_en} onChange={(e) => set("name_en", e.target.value)} placeholder="Sylhet local" /></div>
                <div><label className="form-label">নাম (বাংলা) *</label><input className="input" value={form.name_bn} onChange={(e) => set("name_bn", e.target.value)} placeholder="সিলেট লোকাল" /></div>
              </div>
              <div>
                <label className="form-label">জেলাসমূহ * <span className="text-muted font-normal">(কমা/লাইন আলাদা — ঠিক নাম)</span></label>
                <textarea className="input" rows={2} value={form.districts} onChange={(e) => set("districts", e.target.value)} placeholder="Sylhet, Moulvibazar, Habiganj" />
              </div>
              <div>
                <label className="form-label">উপজেলা <span className="text-muted font-normal">(ঐচ্ছিক — খালি = পুরো জেলা)</span></label>
                <textarea className="input" rows={2} value={form.upazilas} onChange={(e) => set("upazilas", e.target.value)} placeholder="Beanibazar, Golapganj" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">চার্জ (৳) *</label><input type="number" className="input" value={form.charge} onChange={(e) => set("charge", e.target.value)} /></div>
                <div><label className="form-label">ফ্রি ডেলিভারি (৳-এর বেশি)</label><input type="number" className="input" value={form.free_threshold} onChange={(e) => set("free_threshold", e.target.value)} placeholder="খালি = ফ্রি নেই" /></div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} /> সক্রিয়</label>
                <div className="flex items-center gap-2 text-sm">ক্রম <input type="number" className="input w-20 py-1" value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} /></div>
              </div>
              <p className="text-[11px] text-muted">একাধিক জোন মিললে <b>ক্রম</b> (ছোট আগে) অনুযায়ী প্রথমটি প্রযোজ্য হবে।</p>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-[var(--line)]">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-outline btn-md flex-1">বাতিল</button>
              <button type="button" onClick={save} disabled={saving} className="btn btn-brand btn-md flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} সেভ করুন</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!delId} onCancel={() => setDelId(null)} onConfirm={doDelete} title="জোন মুছবেন?" message="এই ডেলিভারি জোনটি মুছে ফেলা হবে।" confirmLabel="মুছুন" variant="danger" />
    </div>
  );
}
