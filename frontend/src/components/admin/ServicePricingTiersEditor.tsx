"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronUp, Loader2, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import BnEnText from "@/components/admin/catalog/BnEnText";
import { InlineText } from "@/components/ui/RichText";
import { aiCatalogApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import type { ServicePricingTier } from "@/types";

/**
 * Packages (pricing tiers) of the Service editor, in plain Bangla: name
 * chips, feature rows, Bangla-first description, up/down order, "3 packages"
 * starter, AI suggestions and a site-style preview. All saving still goes
 * through the parent page's handlers.
 */

export type TierDraft = Partial<ServicePricingTier>;

interface Props {
  isNew: boolean;
  tiers: ServicePricingTier[] | undefined;
  tierFormOpen: boolean;
  openTierEditor: (tier?: ServicePricingTier) => void;
  closeTierEditor: () => void;
  deletingTierId: string | null;
  handleDeleteTier: (tierId: string) => void;
  newTier: Partial<ServicePricingTier>;
  setNewTier: React.Dispatch<React.SetStateAction<Partial<ServicePricingTier>>>;
  savingTier: boolean;
  handleSaveTier: () => void;
  editingTierId: string | null;
  /** Add several packages at once (starter / AI). */
  onAddMany?: (drafts: TierDraft[]) => Promise<void>;
  onMove?: (tierId: string, dir: -1 | 1) => void;
  serviceName?: string;
  notes?: string;
}

const NAME_CHIPS = ["বেসিক", "স্ট্যান্ডার্ড", "প্রিমিয়াম", "Basic", "Standard", "Premium"];
const STARTER: TierDraft[] = [
  { tier_name: "বেসিক", description_bn: "সাধারণ প্রয়োজনের জন্য", features: ["মূল কাজ"], price: 0, is_active: false },
  { tier_name: "স্ট্যান্ডার্ড", description_bn: "বেশিরভাগ গ্রাহকের পছন্দ", features: ["মূল কাজ", "অতিরিক্ত সুবিধা"], price: 0, is_active: false },
  { tier_name: "প্রিমিয়াম", description_bn: "সব সুবিধাসহ সম্পূর্ণ সেবা", features: ["মূল কাজ", "অতিরিক্ত সুবিধা", "দ্রুত ডেলিভারি"], price: 0, is_active: false },
];
const bnPrice = (n?: number) => (n || n === 0 ? `৳${Number(n).toLocaleString("bn-BD")}` : "—");

export default function ServicePricingTiersEditor({
  isNew, tiers, tierFormOpen, openTierEditor, closeTierEditor, deletingTierId, handleDeleteTier,
  newTier, setNewTier, savingTier, handleSaveTier, editingTierId, onAddMany, onMove, serviceName, notes,
}: Props) {
  const toast = useToastStore((s) => s.push);
  const [busy, setBusy] = useState(false);

  if (isNew) {
    return (
      <section className="rounded-xl border border-dashed border-[var(--line)] p-3 text-sm text-muted">
        📦 <b className="text-heading">প্যাকেজ:</b> আগে সেবাটি একবার সেভ করুন (খসড়া হলেও চলবে) — তারপর এখানে এক চাপে বেসিক/স্ট্যান্ডার্ড/প্রিমিয়াম প্যাকেজ বানাতে পারবেন।
      </section>
    );
  }

  const sorted = [...(tiers ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const features = newTier.features ?? [];
  const setFeatures = (f: string[]) => setNewTier((p) => ({ ...p, features: f }));

  const addStarter = async () => {
    if (!onAddMany) return;
    setBusy(true);
    try { await onAddMany(STARTER); } finally { setBusy(false); }
  };
  const askAi = async () => {
    if (!onAddMany) return;
    if (!serviceName?.trim()) { toast("error", "আগে সেবার নাম লিখুন"); return; }
    setBusy(true);
    try {
      const r = await aiCatalogApi.serviceDetails({ name: serviceName, notes, parts: ["packages"] });
      const pk = r.data.data?.packages ?? [];
      if (!pk.length) throw new Error("empty");
      await onAddMany(pk.map((p) => ({ ...p, duration_days: p.duration_days ?? undefined, price: 0, is_active: false })));
    } catch (e) {
      toast("error", apiErrorMessage(e, "AI প্যাকেজ প্রস্তাব করতে পারেনি"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-[var(--line)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-heading">📦 প্যাকেজ ({sorted.length})</h3>
          <p className="text-[11px] text-muted">একই সেবার আলাদা দামের প্যাকেজ (যেমন বেসিক/প্রিমিয়াম)। প্রয়োজন না হলে খালি রাখুন।</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onAddMany && sorted.length === 0 && (
            <button type="button" onClick={addStarter} disabled={busy} className="btn btn-outline btn-sm gap-1 min-h-11">📦 ৩টি প্যাকেজ বানান</button>
          )}
          {onAddMany && (
            <button type="button" onClick={askAi} disabled={busy} className="btn btn-outline btn-sm gap-1 min-h-11">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} AI প্রস্তাব
            </button>
          )}
          <button type="button" onClick={() => (tierFormOpen ? closeTierEditor() : openTierEditor())} className="btn btn-brand btn-sm gap-1 min-h-11">
            {tierFormOpen ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {tierFormOpen ? "বাতিল" : "প্যাকেজ যোগ"}
          </button>
        </div>
      </div>
      {sorted.some((t) => t.is_active === false) && (
        <p className="text-[11px] rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200 px-2 py-1">
          ⚠️ লুকানো প্যাকেজগুলো সাইটে দেখায় না — ✏️ চেপে দাম বসান ও “সাইটে দেখাবে” টিক দিন।
        </p>
      )}

      {/* Site-style cards */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {sorted.map((tier, idx) => (
            <div key={tier.id} className={`rounded-xl border p-3 space-y-1.5 ${tier.is_active === false ? "border-dashed border-gray-300 opacity-70" : "border-[var(--line)] bg-white dark:bg-white/5"}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-heading break-words">{tier.tier_name}{tier.is_active === false && <span className="ml-1 text-[10px] font-normal text-gray-500">(লুকানো)</span>}</p>
                <p className="text-brand-600 font-bold whitespace-nowrap">{bnPrice(tier.price)}</p>
              </div>
              {tier.duration_days ? <p className="text-[11px] text-muted">⏱️ {tier.duration_days} দিনে</p> : null}
              {(tier.description_bn || tier.description_en) && <p className="text-xs text-muted line-clamp-2"><InlineText text={tier.description_bn || tier.description_en} /></p>}
              {tier.features?.length ? (
                <ul className="text-xs space-y-0.5">{tier.features.slice(0, 5).map((f, i) => <li key={i}>✓ <InlineText text={f} /></li>)}</ul>
              ) : null}
              <div className="flex justify-end gap-0.5 pt-1">
                {onMove && (
                  <>
                    <button type="button" onClick={() => onMove(tier.id, -1)} disabled={idx === 0} aria-label="আগে" className="min-h-10 min-w-10 flex items-center justify-center text-gray-400 hover:text-brand-600 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                    <button type="button" onClick={() => onMove(tier.id, 1)} disabled={idx === sorted.length - 1} aria-label="পরে" className="min-h-10 min-w-10 flex items-center justify-center text-gray-400 hover:text-brand-600 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                  </>
                )}
                <button type="button" onClick={() => openTierEditor(tier)} aria-label={`সম্পাদনা: ${tier.tier_name}`} className="min-h-10 min-w-10 flex items-center justify-center text-gray-400 hover:text-brand-600"><Pencil className="w-4 h-4" /></button>
                <button type="button" onClick={() => handleDeleteTier(tier.id)} disabled={deletingTierId === tier.id} aria-label={`মুছুন: ${tier.tier_name}`} className="min-h-10 min-w-10 flex items-center justify-center text-gray-400 hover:text-red-500">
                  {deletingTierId === tier.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tierFormOpen && (
        <div className="rounded-xl border border-brand-200 dark:border-brand-500/30 bg-brand-50/30 dark:bg-brand-500/5 p-3 space-y-3">
          <p className="text-sm font-semibold text-heading">{editingTierId ? "প্যাকেজ সম্পাদনা" : "নতুন প্যাকেজ"}</p>
          <div>
            <label className="form-label">প্যাকেজের নাম <span className="text-red-500">*</span></label>
            <input value={newTier.tier_name ?? ""} onChange={(e) => setNewTier((p) => ({ ...p, tier_name: e.target.value }))} placeholder="যেমন: বেসিক" className="input w-full" />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {NAME_CHIPS.map((c) => (
                <button key={c} type="button" onClick={() => setNewTier((p) => ({ ...p, tier_name: c }))} className="rounded-full border border-[var(--line)] px-2.5 min-h-9 text-xs hover:border-brand-400">{c}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">দাম (৳) <span className="text-red-500">*</span></label>
              <input type="number" inputMode="numeric" min={0} value={newTier.price ?? ""} onChange={(e) => setNewTier((p) => ({ ...p, price: e.target.value === "" ? (undefined as unknown as number) : Number(e.target.value) }))} placeholder="0" className="input w-full" />
            </div>
            <div>
              <label className="form-label">কত দিনে শেষ <span className="text-gray-400 font-normal">(ঐচ্ছিক)</span></label>
              <input type="number" min={1} value={newTier.duration_days ?? ""} onChange={(e) => setNewTier((p) => ({ ...p, duration_days: e.target.value ? Number(e.target.value) : undefined }))} placeholder="যেমন: ৭" className="input w-full" />
            </div>
          </div>
          <BnEnText label="প্যাকেজের বিবরণ" rich rows={3} bn={newTier.description_bn} en={newTier.description_en}
            onBn={(v) => setNewTier((p) => ({ ...p, description_bn: v }))} onEn={(v) => setNewTier((p) => ({ ...p, description_en: v }))}
            placeholderBn="এই প্যাকেজে কী কী পাবেন" />
          <div>
            <label className="form-label">এই প্যাকেজে যা আছে (ফিচার)</label>
            <div className="space-y-1.5">
              {features.map((f, i) => (
                <div key={i} className="flex gap-1.5">
                  <input value={f} onChange={(e) => setFeatures(features.map((x, j) => (j === i ? e.target.value : x)))} className="input flex-1 text-sm" placeholder={`ফিচার ${i + 1}`} dir="auto" />
                  <button type="button" onClick={() => setFeatures(features.filter((_, j) => j !== i))} aria-label="মুছুন" className="min-h-11 min-w-11 flex items-center justify-center text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ))}
              <button type="button" onClick={() => setFeatures([...features, ""])} className="text-xs font-medium text-brand-600 hover:underline min-h-10">+ ফিচার যোগ করুন</button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer min-h-11">
            <input type="checkbox" checked={newTier.is_active !== false} onChange={(e) => setNewTier((p) => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 rounded" />
            সাইটে দেখাবে
          </label>
          <details className="rounded-lg border border-[var(--line)]">
            <summary className="cursor-pointer select-none px-3 py-2 text-sm text-heading min-h-11 flex items-center">⚙️ আরও (ঐচ্ছিক)</summary>
            <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label text-xs">শুধু অ্যাডমিনের নোট <span className="text-gray-400 font-normal">(সাইটে দেখায় না)</span></label>
                <textarea rows={2} value={newTier.includes ?? ""} onChange={(e) => setNewTier((p) => ({ ...p, includes: e.target.value }))} className="input w-full text-sm" />
              </div>
              <div>
                <label className="form-label text-xs">ক্রম নম্বর</label>
                <input type="number" value={newTier.sort_order ?? 0} onChange={(e) => setNewTier((p) => ({ ...p, sort_order: Number(e.target.value) }))} className="input w-full" />
              </div>
            </div>
          </details>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeTierEditor} className="btn btn-outline btn-sm min-h-11">বাতিল</button>
            <button type="button" onClick={handleSaveTier} disabled={savingTier} className="btn btn-brand btn-sm gap-1 min-h-11">
              {savingTier ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {editingTierId ? "প্যাকেজ সেভ করুন" : "প্যাকেজ যোগ করুন"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
