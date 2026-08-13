"use client";

import { Loader2, Pencil, Trash2, Plus, ChevronUp } from "lucide-react";
import type { ServiceBookingFormField } from "@/types";

/**
 * Booking-form-field CRUD section of the Service editor drawer. Extracted
 * verbatim from app/sumon/services/page.tsx (previously ~1874 lines in one
 * file) — pure presentation, no state or handler logic moved. All state, API
 * calls and the confirm dialog for delete still live in the parent page;
 * this component only receives them as props.
 *
 * `readCondition`/`writeCondition`/`CONDITION_OPS` moved here since this is
 * their primary consumer; the parent still needs `readCondition` (to seed
 * the editor when opening a field) and `writeCondition` (to save), so both
 * are re-exported and imported back into the parent.
 */

/** show_if operators the booking engine understands (core/booking_form.py). */
export const CONDITION_OPS: { value: string; label: string }[] = [
  { value: "equals", label: "is exactly" },
  { value: "not_equals", label: "is not" },
  { value: "in", label: "is one of" },
];

type ShowIf = { field?: string; equals?: unknown; not_equals?: unknown; in?: unknown[] };

/** Read a field's conditional_logic into the editor's flat shape. */
export function readCondition(field: Partial<ServiceBookingFormField>): { field: string; op: string; value: string } {
  const showIf = (field.conditional_logic as { show_if?: ShowIf } | null)?.show_if;
  if (!showIf?.field) return { field: "", op: "equals", value: "" };
  const op = CONDITION_OPS.find((o) => o.value in showIf)?.value ?? "equals";
  const raw = (showIf as Record<string, unknown>)[op];
  return { field: showIf.field, op, value: Array.isArray(raw) ? raw.join(", ") : String(raw ?? "") };
}

/** Build conditional_logic from the editor's flat shape (null = always shown). */
export function writeCondition(c: { field: string; op: string; value: string }): Record<string, unknown> | null {
  if (!c.field) return null;
  const value =
    c.op === "in"
      ? c.value.split(",").map((v) => v.trim()).filter(Boolean)
      : c.value.trim();
  return { show_if: { field: c.field, [c.op]: value } };
}

interface Props {
  isNew: boolean;
  fields: ServiceBookingFormField[] | undefined;
  fieldFormOpen: boolean;
  openFieldEditor: (field?: ServiceBookingFormField) => void;
  closeFieldEditor: () => void;
  deletingFieldId: string | null;
  handleDeleteField: (fieldId: string) => void;
  newField: Partial<ServiceBookingFormField>;
  setNewField: React.Dispatch<React.SetStateAction<Partial<ServiceBookingFormField>>>;
  condition: { field: string; op: string; value: string };
  setCondition: React.Dispatch<React.SetStateAction<{ field: string; op: string; value: string }>>;
  editingFieldId: string | null;
  savingField: boolean;
  handleSaveField: () => void;
}

export default function ServiceBookingFormFieldsEditor({
  isNew, fields, fieldFormOpen, openFieldEditor, closeFieldEditor, deletingFieldId,
  handleDeleteField, newField, setNewField, condition, setCondition, editingFieldId,
  savingField, handleSaveField,
}: Props) {
  if (isNew) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Booking Form Fields ({fields?.length ?? 0})
        </h3>
        <button
          onClick={() => (fieldFormOpen ? closeFieldEditor() : openFieldEditor())}
          className="btn btn-outline btn-sm gap-1 text-xs"
        >
          {fieldFormOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {fieldFormOpen ? "Cancel" : "Add Field"}
        </button>
      </div>

      {/* Existing fields — shown in the order the customer sees. */}
      {[...(fields ?? [])]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(field => {
        const cond = readCondition(field);
        return (
        <div key={field.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {field.field_label_en}
              {field.is_active === false && (
                <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400 border border-gray-300 rounded px-1">
                  hidden
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500">
              <span className="font-mono">{field.field_name}</span>
              {" · "}
              <span className="capitalize">{field.field_type}</span>
              {" · #"}{field.sort_order ?? 0}
              {field.is_required && <span className="text-red-400 ml-1">*required</span>}
            </p>
            {cond.field && (
              <p className="text-[11px] text-brand-600 mt-0.5">
                Shown only if <span className="font-mono">{cond.field}</span>{" "}
                {CONDITION_OPS.find(o => o.value === cond.op)?.label} “{cond.value}”
              </p>
            )}
          </div>
          <button
            onClick={() => openFieldEditor(field)}
            aria-label={`Edit ${field.field_label_en}`}
            className="p-1 text-gray-400 hover:text-brand-600 flex-shrink-0 rounded transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteField(field.id)}
            disabled={deletingFieldId === field.id}
            aria-label={`Delete ${field.field_label_en}`}
            className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0 rounded transition-colors"
          >
            {deletingFieldId === field.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
        );
      })}

      {/* New field form */}
      {fieldFormOpen && (
        <div className="border border-brand-100 rounded-xl p-4 space-y-3 bg-brand-50/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label text-[11px]">Field Name (machine) <span className="text-red-400">*</span></label>
              <input
                value={newField.field_name ?? ""}
                onChange={e => setNewField(p => ({ ...p, field_name: e.target.value.replace(/\s+/g, "_").toLowerCase() }))}
                placeholder="e.g. business_name"
                className="input w-full text-sm font-mono"
              />
            </div>
            <div>
              <label className="form-label text-[11px]">Field Type <span className="text-red-400">*</span></label>
              <select
                value={newField.field_type ?? "text"}
                onChange={e => setNewField(p => ({ ...p, field_type: e.target.value }))}
                className="input w-full text-sm"
              >
                {/* Only types supported end-to-end (public renderer + server validator) */}
                {["text", "textarea", "number", "email", "phone", "url", "date", "datetime", "select", "multiselect", "radio", "checkbox", "file"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label text-[11px]">Label (EN) <span className="text-red-400">*</span></label>
              <input
                value={newField.field_label_en ?? ""}
                onChange={e => setNewField(p => ({ ...p, field_label_en: e.target.value }))}
                placeholder="e.g. Business Name"
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="form-label text-[11px]">Label (বাংলা)</label>
              <input
                value={newField.field_label_bn ?? ""}
                onChange={e => setNewField(p => ({ ...p, field_label_bn: e.target.value }))}
                placeholder="ব্যবসার নাম"
                className="input w-full text-sm"
                dir="auto"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label text-[11px]">Placeholder</label>
              <input
                value={newField.placeholder ?? ""}
                onChange={e => setNewField(p => ({ ...p, placeholder: e.target.value }))}
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="form-label text-[11px]">Default Value</label>
              <input
                value={newField.default_value ?? ""}
                onChange={e => setNewField(p => ({ ...p, default_value: e.target.value }))}
                className="input w-full text-sm"
              />
            </div>
          </div>
          {["select", "multiselect", "radio"].includes(newField.field_type ?? "") && (
            <div>
              <label className="form-label text-[11px]">Options (one per line)</label>
              <textarea
                rows={3}
                value={(newField.options ?? []).join("\n")}
                onChange={e => setNewField(p => ({ ...p, options: e.target.value.split("\n").filter(Boolean) }))}
                placeholder={"Option 1\nOption 2\nOption 3"}
                className="input w-full text-sm resize-none font-mono"
              />
            </div>
          )}
          {/* Validation rules — enforced server-side on every booking */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="form-label text-[11px]">Min Length</label>
              <input
                type="number"
                min={0}
                value={(newField.validation_rules?.min_length as number | undefined) ?? ""}
                onChange={e => setNewField(p => ({ ...p, validation_rules: { ...(p.validation_rules ?? {}), min_length: e.target.value ? Number(e.target.value) : undefined } }))}
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="form-label text-[11px]">Max Length</label>
              <input
                type="number"
                min={0}
                value={(newField.validation_rules?.max_length as number | undefined) ?? ""}
                onChange={e => setNewField(p => ({ ...p, validation_rules: { ...(p.validation_rules ?? {}), max_length: e.target.value ? Number(e.target.value) : undefined } }))}
                className="input w-full text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="form-label text-[11px]">Pattern (regex) <span className="text-gray-400 font-normal">e.g. ^\d{"{"}10{"}"}$ for NID</span></label>
              <input
                value={(newField.validation_rules?.pattern as string | undefined) ?? ""}
                onChange={e => setNewField(p => ({ ...p, validation_rules: { ...(p.validation_rules ?? {}), pattern: e.target.value || undefined } }))}
                placeholder="^[0-9]{10,17}$"
                className="input w-full text-sm font-mono"
              />
            </div>
          </div>
          {(newField.validation_rules?.pattern as string | undefined) && (
            <div>
              <label className="form-label text-[11px]">Pattern Error Message</label>
              <input
                value={(newField.validation_rules?.pattern_message as string | undefined) ?? ""}
                onChange={e => setNewField(p => ({ ...p, validation_rules: { ...(p.validation_rules ?? {}), pattern_message: e.target.value || undefined } }))}
                placeholder="e.g. Enter a valid 10-17 digit NID number"
                className="input w-full text-sm"
              />
            </div>
          )}
          {/* Numeric bounds — enforced server-side for number/integer fields */}
          {["number", "integer"].includes(newField.field_type ?? "") && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label text-[11px]">Min Value</label>
                <input
                  type="number"
                  value={(newField.validation_rules?.min as number | undefined) ?? ""}
                  onChange={e => setNewField(p => ({ ...p, validation_rules: { ...(p.validation_rules ?? {}), min: e.target.value ? Number(e.target.value) : undefined } }))}
                  className="input w-full text-sm"
                />
              </div>
              <div>
                <label className="form-label text-[11px]">Max Value</label>
                <input
                  type="number"
                  value={(newField.validation_rules?.max as number | undefined) ?? ""}
                  onChange={e => setNewField(p => ({ ...p, validation_rules: { ...(p.validation_rules ?? {}), max: e.target.value ? Number(e.target.value) : undefined } }))}
                  className="input w-full text-sm"
                />
              </div>
            </div>
          )}

          {/* Conditional visibility — the booking form and the server
              both honour this rule (core/booking_form.py show_if). */}
          <div className="border-t border-brand-100 pt-3">
            <label className="form-label text-[11px]">Conditional Visibility</label>
            <p className="text-[11px] text-gray-400 mb-2">
              Leave the field blank to always show this question.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={condition.field}
                onChange={e => setCondition(c => ({ ...c, field: e.target.value }))}
                className="input w-full text-sm"
              >
                <option value="">— Always show —</option>
                {(fields ?? [])
                  .filter(f => f.id !== editingFieldId)
                  .map(f => (
                    <option key={f.id} value={f.field_name}>{f.field_label_en}</option>
                  ))}
              </select>
              <select
                value={condition.op}
                onChange={e => setCondition(c => ({ ...c, op: e.target.value }))}
                disabled={!condition.field}
                className="input w-full text-sm"
              >
                {CONDITION_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input
                value={condition.value}
                onChange={e => setCondition(c => ({ ...c, value: e.target.value }))}
                disabled={!condition.field}
                placeholder={condition.op === "in" ? "value1, value2" : "value"}
                className="input w-full text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label text-[11px]">Sort Order</label>
              <input
                type="number"
                value={newField.sort_order ?? 0}
                onChange={e => setNewField(p => ({ ...p, sort_order: Number(e.target.value) }))}
                className="input w-full text-sm"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!newField.is_required}
                  onChange={e => setNewField(p => ({ ...p, is_required: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-700">Required</span>
              </label>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer" title="Uncheck to hide this question from the booking form without deleting it">
                <input
                  type="checkbox"
                  checked={newField.is_active !== false}
                  onChange={e => setNewField(p => ({ ...p, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={closeFieldEditor} className="btn btn-outline btn-sm text-xs">Cancel</button>
            <button onClick={handleSaveField} disabled={savingField} className="btn btn-primary btn-sm text-xs gap-1">
              {savingField ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              {editingFieldId ? "Save Field" : "Add Field"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
