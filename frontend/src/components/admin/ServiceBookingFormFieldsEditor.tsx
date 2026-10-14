"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronUp, Loader2, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import TranslateButton from "@/components/admin/TranslateButton";
import { aiCatalogApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import {
  FIELD_TEMPLATES, FIELD_TYPES, VALIDATION_PRESETS, hasOptions, optionLabel, presetOf, typeMeta, type FieldDraft,
} from "@/lib/bookingFieldKit";
import { useToastStore } from "@/store/toast";
import type { ServiceBookingFormField } from "@/types";

/**
 * Booking-form builder of the Service editor, in plain Bangla for a
 * non-technical admin: one-tap question sets, AI suggestions, icon type
 * picker, up/down ordering, validation presets instead of regex, and the
 * machine name filled automatically. All state, API calls and the delete
 * confirm still live in the parent page; this component receives them.
 *
 * `readCondition`/`writeCondition` stay exported for the parent.
 */

/** show_if operators the booking engine understands (core/booking_form.py). */
export const CONDITION_OPS: { value: string; label: string }[] = [
  { value: "equals", label: "উত্তর ঠিক এটি হলে" },
  { value: "not_equals", label: "উত্তর এটি না হলে" },
  { value: "in", label: "উত্তর এগুলোর যেকোনো একটি হলে" },
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
  /** Add several ready-made questions at once (templates / AI). */
  onAddMany?: (drafts: FieldDraft[]) => Promise<void>;
  /** Move a question one place up (-1) or down (+1). */
  onMove?: (fieldId: string, dir: -1 | 1) => void;
  /** Used for AI suggestions. */
  serviceName?: string;
  serviceNotes?: string;
}

const small = "block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1";

/** Ticked list of suggested questions → "add selected". */
function SuggestionPicker({ title, drafts, existing, onAdd, onClose }: {
  title: string; drafts: FieldDraft[]; existing: string[]; onAdd: (d: FieldDraft[]) => Promise<void>; onClose: () => void;
}) {
  const isDup = (d: FieldDraft) => existing.includes((d.field_label_en || "").toLowerCase()) || existing.includes((d.field_label_bn || "").toLowerCase());
  const [picked, setPicked] = useState<boolean[]>(() => drafts.map((d) => !isDup(d)));
  const [adding, setAdding] = useState(false);
  const count = picked.filter(Boolean).length;
  return (
    <div className="rounded-xl border border-brand-200 dark:border-brand-500/30 bg-brand-50/40 dark:bg-brand-500/5 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-heading">{title}</p>
        <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600" aria-label="বন্ধ"><X className="w-4 h-4" /></button>
      </div>
      <ul className="space-y-1.5">
        {drafts.map((d, i) => {
          const m = typeMeta(d.field_type);
          return (
            <li key={i}>
              <label className="flex items-start gap-2 rounded-lg bg-white dark:bg-white/5 border border-[var(--line)] px-3 py-2 cursor-pointer">
                <input type="checkbox" className="rounded mt-1" checked={picked[i]} onChange={() => setPicked((p) => p.map((x, j) => (j === i ? !x : x)))} />
                <span className="min-w-0 text-sm">
                  <span className="font-medium text-heading">{m.icon} {d.field_label_bn || d.field_label_en}</span>
                  {d.is_required && <span className="text-red-500"> *</span>}
                  <span className="block text-xs text-muted">
                    {m.bn}{d.options?.length ? ` · ${d.options.join(" / ")}` : ""}{isDup(d) ? " · আগে থেকেই আছে" : ""}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-end">
        <button type="button" disabled={!count || adding} className="btn btn-brand btn-sm gap-1.5 min-h-11"
          onClick={async () => { setAdding(true); try { await onAdd(drafts.filter((_, i) => picked[i])); onClose(); } finally { setAdding(false); } }}>
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} বাছাই করা {count}টি প্রশ্ন যোগ করুন
        </button>
      </div>
    </div>
  );
}

export default function ServiceBookingFormFieldsEditor({
  isNew, fields, fieldFormOpen, openFieldEditor, closeFieldEditor, deletingFieldId,
  handleDeleteField, newField, setNewField, condition, setCondition, editingFieldId,
  savingField, handleSaveField, onAddMany, onMove, serviceName, serviceNotes,
}: Props) {
  const toast = useToastStore((s) => s.push);
  const [panel, setPanel] = useState<"" | "templates" | "ai">("");
  const [template, setTemplate] = useState<string>("");
  const [aiDrafts, setAiDrafts] = useState<FieldDraft[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  if (isNew) {
    return (
      <section className="rounded-xl border border-dashed border-[var(--line)] p-3 text-sm text-muted">
        📋 <b className="text-heading">বুকিং ফরমের প্রশ্ন:</b> আগে সেবাটি একবার সেভ করুন (খসড়া হলেও চলবে) — তারপর এখানে তৈরি নমুনা বা AI দিয়ে এক চাপে প্রশ্ন যোগ করতে পারবেন।
      </section>
    );
  }

  const sorted = [...(fields ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const existingLabels = sorted.flatMap((f) => [f.field_label_en.toLowerCase(), (f.field_label_bn || "").toLowerCase()]);
  const options = newField.options ?? [];
  const setOptions = (next: string[]) => setNewField((p) => ({ ...p, options: next }));
  const preset = presetOf(newField.validation_rules);
  const sourceField = sorted.find((f) => f.field_name === condition.field);

  const askAi = async () => {
    if (!serviceName?.trim()) { toast("error", "আগে সেবার নাম লিখুন"); return; }
    setPanel("ai");
    setAiDrafts(null);
    setAiLoading(true);
    try {
      const r = await aiCatalogApi.bookingFields({ name: serviceName, notes: serviceNotes });
      setAiDrafts((r.data.data?.fields ?? []).map((f) => ({
        field_label_en: f.field_label_en, field_label_bn: f.field_label_bn, field_type: f.field_type,
        is_required: f.is_required, placeholder: f.placeholder ?? undefined,
        options: f.options.map((o) => optionLabel(o.bn, o.en)),
      })));
    } catch (e) {
      setPanel("");
      toast("error", apiErrorMessage(e, "AI প্রস্তাব আনা যায়নি — একটু পরে আবার চেষ্টা করুন"));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-heading">📋 বুকিং ফরমের প্রশ্ন ({sorted.length})</h3>
          <p className="text-xs text-muted">গ্রাহক বুকিং/কোটেশনের সময় এই প্রশ্নগুলোর উত্তর দেবেন। নাম, ফোন ও ঠিকানা ফরমে আগে থেকেই থাকে।</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onAddMany && (
            <>
              <button type="button" onClick={() => setPanel((p) => (p === "templates" ? "" : "templates"))} className="btn btn-outline btn-sm gap-1 min-h-11">📋 তৈরি নমুনা</button>
              <button type="button" onClick={askAi} disabled={aiLoading} className="btn btn-outline btn-sm gap-1 min-h-11">
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} AI প্রস্তাব
              </button>
            </>
          )}
          <button type="button" onClick={() => (fieldFormOpen ? closeFieldEditor() : openFieldEditor())} className="btn btn-brand btn-sm gap-1 min-h-11">
            {fieldFormOpen ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {fieldFormOpen ? "বাতিল" : "প্রশ্ন যোগ করুন"}
          </button>
        </div>
      </div>

      {panel === "templates" && onAddMany && (
        template ? (
          <SuggestionPicker
            title={`${FIELD_TEMPLATES.find((t) => t.id === template)?.icon} ${FIELD_TEMPLATES.find((t) => t.id === template)?.bn} — কোন প্রশ্নগুলো লাগবে?`}
            drafts={FIELD_TEMPLATES.find((t) => t.id === template)?.fields ?? []}
            existing={existingLabels}
            onAdd={onAddMany}
            onClose={() => { setTemplate(""); setPanel(""); }}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {FIELD_TEMPLATES.map((t) => (
              <button key={t.id} type="button" onClick={() => setTemplate(t.id)}
                className="rounded-xl border border-[var(--line)] bg-white dark:bg-white/5 px-3 py-3 text-left hover:border-brand-400 min-h-11">
                <span className="text-xl">{t.icon}</span>
                <span className="block text-sm font-semibold text-heading mt-1">{t.bn}</span>
                <span className="block text-[11px] text-muted">{t.fields.length}টি প্রশ্ন</span>
              </button>
            ))}
          </div>
        )
      )}
      {panel === "ai" && onAddMany && (
        aiLoading || !aiDrafts ? (
          <p className="text-sm text-muted flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> AI “{serviceName}”-এর জন্য প্রশ্ন ভাবছে…</p>
        ) : (
          <SuggestionPicker title="✨ AI-এর প্রস্তাবিত প্রশ্ন — দেখে বাছাই করুন" drafts={aiDrafts} existing={existingLabels} onAdd={onAddMany} onClose={() => setPanel("")} />
        )
      )}

      {/* Existing questions — in the order the customer sees them. */}
      {sorted.length === 0 && !fieldFormOpen && panel === "" && (
        <p className="text-xs text-muted rounded-lg bg-gray-50 dark:bg-white/5 px-3 py-2">এখনো কোনো প্রশ্ন নেই — “তৈরি নমুনা” বা “AI প্রস্তাব” চাপুন।</p>
      )}
      {sorted.map((field, idx) => {
        const cond = readCondition(field);
        const m = typeMeta(field.field_type);
        const src = sorted.find((f) => f.field_name === cond.field);
        return (
          <div key={field.id} className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
            <span className="text-lg leading-none mt-0.5" aria-hidden>{m.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-heading break-words">
                {field.field_label_bn || field.field_label_en}
                {field.is_required && <span className="text-red-500"> *</span>}
                {field.is_active === false && <span className="ml-2 text-[10px] text-gray-500 border border-gray-300 rounded px-1">লুকানো</span>}
              </p>
              <p className="text-xs text-muted break-words">
                {m.bn}
                {field.field_label_bn && field.field_label_en !== field.field_label_bn && <> · {field.field_label_en}</>}
                {field.options?.length ? <> · {field.options.join(" / ")}</> : null}
              </p>
              {cond.field && (
                <p className="text-[11px] text-brand-600 mt-0.5">
                  শুধু তখন দেখাবে যখন “{src?.field_label_bn || src?.field_label_en || cond.field}”-এর {CONDITION_OPS.find((o) => o.value === cond.op)?.label}: “{cond.value}”
                </p>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-0.5">
              {onMove && (
                <>
                  <button type="button" onClick={() => onMove(field.id, -1)} disabled={idx === 0} aria-label="উপরে সরান"
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-400 hover:text-brand-600 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                  <button type="button" onClick={() => onMove(field.id, 1)} disabled={idx === sorted.length - 1} aria-label="নিচে সরান"
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-400 hover:text-brand-600 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                </>
              )}
              <button type="button" onClick={() => openFieldEditor(field)} aria-label={`সম্পাদনা: ${field.field_label_bn || field.field_label_en}`}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-400 hover:text-brand-600"><Pencil className="w-4 h-4" /></button>
              <button type="button" onClick={() => handleDeleteField(field.id)} disabled={deletingFieldId === field.id} aria-label={`মুছুন: ${field.field_label_bn || field.field_label_en}`}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-400 hover:text-red-500">
                {deletingFieldId === field.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        );
      })}

      {/* Add / edit one question */}
      {fieldFormOpen && (
        <div className="border border-brand-200 dark:border-brand-500/30 rounded-xl p-3 sm:p-4 space-y-4 bg-brand-50/30 dark:bg-brand-500/5">
          <p className="text-sm font-semibold text-heading">{editingFieldId ? "প্রশ্ন সম্পাদনা" : "নতুন প্রশ্ন"}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={small}>প্রশ্ন (বাংলা) <span className="text-red-500">*</span></label>
              <input value={newField.field_label_bn ?? ""} onChange={(e) => setNewField((p) => ({ ...p, field_label_bn: e.target.value }))}
                placeholder="যেমন: কাগজের সাইজ" className="input w-full" dir="auto" />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <label className={small}>English <span className="text-gray-400 font-normal">(খালি থাকলে নিজে থেকে অনুবাদ)</span></label>
                <TranslateButton bn={newField.field_label_bn} onResult={(t) => setNewField((p) => ({ ...p, field_label_en: t }))} en={newField.field_label_en} onResultBn={(t) => setNewField((p) => ({ ...p, field_label_bn: t }))} />
              </div>
              <input value={newField.field_label_en ?? ""} onChange={(e) => setNewField((p) => ({ ...p, field_label_en: e.target.value }))}
                placeholder="e.g. Paper size" className="input w-full" />
            </div>
          </div>

          <div>
            <label className={small}>উত্তরের ধরন</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
              {FIELD_TYPES.map((t) => (
                <button key={t.value} type="button" onClick={() => setNewField((p) => ({ ...p, field_type: t.value }))}
                  className={`rounded-lg border px-2 py-2 text-left text-xs min-h-11 ${(newField.field_type ?? "text") === t.value ? "border-brand-500 bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-200 font-semibold" : "border-[var(--line)] bg-white dark:bg-white/5"}`}>
                  <span className="mr-1">{t.icon}</span>{t.bn}
                </button>
              ))}
            </div>
          </div>

          {hasOptions(newField.field_type) && (
            <div>
              <label className={small}>উত্তরের অপশনগুলো</label>
              <div className="space-y-1.5">
                {options.map((o, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input value={o} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} className="input flex-1 text-sm" placeholder={`অপশন ${i + 1}`} />
                    <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))} className="min-h-11 min-w-11 flex items-center justify-center text-gray-400 hover:text-red-500" aria-label="অপশন মুছুন"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setOptions([...options, ""])} className="text-xs font-medium text-brand-600 hover:underline min-h-11">+ অপশন যোগ করুন</button>
                <p className="text-[11px] text-muted">দুই ভাষায় দেখাতে চাইলে এভাবে লিখুন: সাদা-কালো (Black &amp; white)</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm min-h-11">
              <input type="checkbox" checked={!!newField.is_required} onChange={(e) => setNewField((p) => ({ ...p, is_required: e.target.checked }))} className="w-4 h-4 rounded" />
              উত্তর দেওয়া বাধ্যতামূলক
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm min-h-11" title="টিক তুলে দিলে প্রশ্নটি মুছবে না, শুধু ফরমে লুকানো থাকবে">
              <input type="checkbox" checked={newField.is_active !== false} onChange={(e) => setNewField((p) => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 rounded" />
              ফরমে দেখাবে
            </label>
          </div>

          <details className="rounded-lg border border-[var(--line)] bg-white/60 dark:bg-white/5">
            <summary className="cursor-pointer select-none px-3 py-2.5 text-sm font-medium text-heading min-h-11">⚙️ আরও সেটিং (ঐচ্ছিক)</summary>
            <div className="px-3 pb-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={small}>ঘরের ভেতরে উদাহরণ লেখা</label>
                  <input value={newField.placeholder ?? ""} onChange={(e) => setNewField((p) => ({ ...p, placeholder: e.target.value }))} className="input w-full text-sm" placeholder="যেমন: Samsung A15" />
                </div>
                <div>
                  <label className={small}>আগে থেকে বসানো উত্তর</label>
                  {hasOptions(newField.field_type) && newField.field_type !== "multiselect" ? (
                    <select value={newField.default_value ?? ""} onChange={(e) => setNewField((p) => ({ ...p, default_value: e.target.value }))} className="input w-full text-sm">
                      <option value="">— নেই —</option>
                      {options.filter(Boolean).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input value={newField.default_value ?? ""} onChange={(e) => setNewField((p) => ({ ...p, default_value: e.target.value }))} className="input w-full text-sm" />
                  )}
                </div>
              </div>

              {!["checkbox", "file", "date", "datetime", "select", "multiselect", "radio"].includes(newField.field_type ?? "") && (
                <div>
                  <label className={small}>উত্তরের শর্ত</label>
                  <select value={preset === "custom" ? "custom" : preset}
                    onChange={(e) => {
                      const p = VALIDATION_PRESETS.find((x) => x.id === e.target.value);
                      if (p) setNewField((f) => ({ ...f, validation_rules: p.rules ? { ...p.rules } : null }));
                    }}
                    className="input w-full text-sm">
                    {VALIDATION_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.bn}</option>)}
                    {preset === "custom" && <option value="custom">নিজস্ব শর্ত (নিচে)</option>}
                  </select>
                </div>
              )}

              {["number", "integer"].includes(newField.field_type ?? "") && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={small}>সর্বনিম্ন সংখ্যা</label>
                    <input type="number" value={(newField.validation_rules?.min as number | undefined) ?? ""}
                      onChange={(e) => setNewField((p) => ({ ...p, validation_rules: { ...(p.validation_rules ?? {}), min: e.target.value ? Number(e.target.value) : undefined } }))} className="input w-full text-sm" />
                  </div>
                  <div>
                    <label className={small}>সর্বোচ্চ সংখ্যা</label>
                    <input type="number" value={(newField.validation_rules?.max as number | undefined) ?? ""}
                      onChange={(e) => setNewField((p) => ({ ...p, validation_rules: { ...(p.validation_rules ?? {}), max: e.target.value ? Number(e.target.value) : undefined } }))} className="input w-full text-sm" />
                  </div>
                </div>
              )}

              {/* Conditional visibility — honoured by the booking form and the server (show_if). */}
              {sorted.filter((f) => f.id !== editingFieldId).length > 0 && (
                <div className="border-t border-[var(--line)] pt-3">
                  <label className={small}>কখন দেখাবে</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select value={condition.field} onChange={(e) => setCondition((c) => ({ ...c, field: e.target.value, value: "" }))} className="input w-full text-sm">
                      <option value="">সবসময় দেখাবে</option>
                      {sorted.filter((f) => f.id !== editingFieldId).map((f) => (
                        <option key={f.id} value={f.field_name}>“{f.field_label_bn || f.field_label_en}”-এর উত্তর অনুযায়ী</option>
                      ))}
                    </select>
                    <select value={condition.op} onChange={(e) => setCondition((c) => ({ ...c, op: e.target.value }))} disabled={!condition.field} className="input w-full text-sm">
                      {CONDITION_OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {sourceField?.options?.length && condition.op !== "in" ? (
                      <select value={condition.value} onChange={(e) => setCondition((c) => ({ ...c, value: e.target.value }))} disabled={!condition.field} className="input w-full text-sm">
                        <option value="">— উত্তর বাছুন —</option>
                        {sourceField.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input value={condition.value} onChange={(e) => setCondition((c) => ({ ...c, value: e.target.value }))} disabled={!condition.field}
                        placeholder={condition.op === "in" ? "উত্তর১, উত্তর২" : "উত্তর"} className="input w-full text-sm" />
                    )}
                  </div>
                </div>
              )}

              <details className="rounded-lg border border-dashed border-[var(--line)]">
                <summary className="cursor-pointer select-none px-3 py-2 text-xs text-muted min-h-11 flex items-center">🛠️ টেকনিক্যাল (সাধারণত বদলাতে হয় না)</summary>
                <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={small}>মেশিন নাম <span className="text-gray-400 font-normal">(খালি = নিজে থেকে)</span></label>
                    <input value={newField.field_name ?? ""} onChange={(e) => setNewField((p) => ({ ...p, field_name: e.target.value.replace(/\s+/g, "_").toLowerCase() }))}
                      placeholder="paper_size" className="input w-full text-sm font-mono" disabled={!!editingFieldId} />
                    {editingFieldId && <p className="text-[11px] text-gray-400 mt-1">পুরনো বুকিংয়ের উত্তর ঠিক রাখতে সেভ করা প্রশ্নের মেশিন নাম বদলায় না।</p>}
                  </div>
                  <div>
                    <label className={small}>সর্বনিম্ন / সর্বোচ্চ অক্ষর</label>
                    <div className="flex gap-2">
                      <input type="number" min={0} value={(newField.validation_rules?.min_length as number | undefined) ?? ""}
                        onChange={(e) => setNewField((p) => ({ ...p, validation_rules: { ...(p.validation_rules ?? {}), min_length: e.target.value ? Number(e.target.value) : undefined } }))} className="input w-full text-sm" placeholder="min" />
                      <input type="number" min={0} value={(newField.validation_rules?.max_length as number | undefined) ?? ""}
                        onChange={(e) => setNewField((p) => ({ ...p, validation_rules: { ...(p.validation_rules ?? {}), max_length: e.target.value ? Number(e.target.value) : undefined } }))} className="input w-full text-sm" placeholder="max" />
                    </div>
                  </div>
                  <div>
                    <label className={small}>প্যাটার্ন (regex)</label>
                    <input value={(newField.validation_rules?.pattern as string | undefined) ?? ""}
                      onChange={(e) => setNewField((p) => ({ ...p, validation_rules: { ...(p.validation_rules ?? {}), pattern: e.target.value || undefined } }))} className="input w-full text-sm font-mono" />
                  </div>
                  <div>
                    <label className={small}>ভুল হলে যে বার্তা দেখাবে</label>
                    <input value={(newField.validation_rules?.pattern_message as string | undefined) ?? ""}
                      onChange={(e) => setNewField((p) => ({ ...p, validation_rules: { ...(p.validation_rules ?? {}), pattern_message: e.target.value || undefined } }))} className="input w-full text-sm" />
                  </div>
                  <div>
                    <label className={small}>ক্রম নম্বর</label>
                    <input type="number" value={newField.sort_order ?? 0} onChange={(e) => setNewField((p) => ({ ...p, sort_order: Number(e.target.value) }))} className="input w-full text-sm" />
                  </div>
                </div>
              </details>
            </div>
          </details>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeFieldEditor} className="btn btn-outline btn-sm w-full sm:w-auto min-h-11">বাতিল</button>
            <button type="button" onClick={handleSaveField} disabled={savingField} className="btn btn-brand btn-sm w-full sm:w-auto gap-1 min-h-11">
              {savingField ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {editingFieldId ? "প্রশ্ন সেভ করুন" : "প্রশ্ন যোগ করুন"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
