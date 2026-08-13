"use client";

import { Loader2, Pencil, Trash2, Plus, ChevronUp } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { ServicePricingTier } from "@/types";

/**
 * Pricing-tier CRUD section of the Service editor drawer. Extracted verbatim
 * from app/sumon/services/page.tsx (previously ~1874 lines in one file) —
 * pure presentation, no state or handler logic moved. All state, API calls
 * and the confirm dialog for delete still live in the parent page; this
 * component only receives them as props.
 */
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
}

export default function ServicePricingTiersEditor({
  isNew, tiers, tierFormOpen, openTierEditor, closeTierEditor, deletingTierId,
  handleDeleteTier, newTier, setNewTier, savingTier, handleSaveTier, editingTierId,
}: Props) {
  if (isNew) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Pricing Tiers ({tiers?.length ?? 0})
        </h3>
        <button
          onClick={() => (tierFormOpen ? closeTierEditor() : openTierEditor())}
          className="btn btn-outline btn-sm gap-1 text-xs"
        >
          {tierFormOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {tierFormOpen ? "Cancel" : "Add Tier"}
        </button>
      </div>

      {/* Existing tiers — shown in the order the customer sees. */}
      {[...(tiers ?? [])]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(tier => (
        <div key={tier.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {tier.tier_name}
              {tier.is_active === false && (
                <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400 border border-gray-300 rounded px-1">
                  hidden
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500">{formatPrice(tier.price)}
              {tier.duration_days ? ` · ${tier.duration_days} days` : ""}
              {` · #${tier.sort_order ?? 0}`}
            </p>
            {tier.description_en && <p className="text-xs text-gray-400 mt-0.5 truncate">{tier.description_en}</p>}
          </div>
          <button
            onClick={() => openTierEditor(tier)}
            aria-label={`Edit ${tier.tier_name}`}
            className="p-1 text-gray-400 hover:text-brand-600 flex-shrink-0 rounded transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteTier(tier.id)}
            disabled={deletingTierId === tier.id}
            aria-label={`Delete ${tier.tier_name}`}
            className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0 rounded transition-colors"
          >
            {deletingTierId === tier.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      ))}

      {/* New tier form */}
      {tierFormOpen && (
        <div className="border border-brand-100 rounded-xl p-4 space-y-3 bg-brand-50/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label text-[11px]">Tier Name <span className="text-red-400">*</span></label>
              <input
                value={newTier.tier_name ?? ""}
                onChange={e => setNewTier(p => ({ ...p, tier_name: e.target.value }))}
                placeholder="e.g. Basic, Premium"
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="form-label text-[11px]">Price (BDT) <span className="text-red-400">*</span></label>
              <input
                type="number"
                value={newTier.price ?? ""}
                onChange={e => setNewTier(p => ({ ...p, price: Number(e.target.value) }))}
                placeholder="0"
                className="input w-full text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label text-[11px]">Duration (days)</label>
              <input
                type="number"
                value={newTier.duration_days ?? ""}
                onChange={e => setNewTier(p => ({ ...p, duration_days: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="e.g. 7"
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="form-label text-[11px]">Sort Order</label>
              <input
                type="number"
                value={newTier.sort_order ?? 0}
                onChange={e => setNewTier(p => ({ ...p, sort_order: Number(e.target.value) }))}
                className="input w-full text-sm"
              />
            </div>
          </div>
          <div>
            <label className="form-label text-[11px]">Description (EN)</label>
            <textarea
              value={newTier.description_en ?? ""}
              onChange={e => setNewTier(p => ({ ...p, description_en: e.target.value }))}
              placeholder="What's included…"
              rows={2}
              className="input w-full text-sm resize-none"
            />
          </div>
          <div>
            <label className="form-label text-[11px]">Description (বাংলা)</label>
            <textarea
              value={newTier.description_bn ?? ""}
              onChange={e => setNewTier(p => ({ ...p, description_bn: e.target.value }))}
              placeholder="প্যাকেজে যা আছে…"
              rows={2}
              className="input w-full text-sm resize-none"
              dir="auto"
            />
          </div>
          <div>
            <label className="form-label text-[11px]">Includes <span className="text-gray-400 font-normal">(internal note)</span></label>
            <input
              value={newTier.includes ?? ""}
              onChange={e => setNewTier(p => ({ ...p, includes: e.target.value }))}
              className="input w-full text-sm"
            />
          </div>
          <div>
            <label className="form-label text-[11px]">Features (one per line)</label>
            <textarea
              value={(newTier.features ?? []).join("\n")}
              onChange={e => setNewTier(p => ({ ...p, features: e.target.value.split("\n").filter(Boolean) }))}
              placeholder="Feature 1&#10;Feature 2"
              rows={3}
              className="input w-full text-sm resize-none font-mono"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer" title="Uncheck to hide this package from the service page without deleting it">
            <input
              type="checkbox"
              checked={newTier.is_active !== false}
              onChange={e => setNewTier(p => ({ ...p, is_active: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-gray-700">Active</span>
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={closeTierEditor} className="btn btn-outline btn-sm text-xs">Cancel</button>
            <button onClick={handleSaveTier} disabled={savingTier} className="btn btn-primary btn-sm text-xs gap-1">
              {savingTier ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              {editingTierId ? "Save Tier" : "Add Tier"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
