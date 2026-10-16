"use client";

import { useDirty, useUnsavedGuard } from "@/hooks/useUnsavedGuard";
import { useEffect, useState, useCallback } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Loader2, Mail, Plus, Pencil, Ban, X, CheckCircle, XCircle, Eye, Code } from "lucide-react";
import { emailTemplatesAdminApi, type EmailTemplateRecord } from "@/lib/api";
import BnEnText from "@/components/admin/catalog/BnEnText";
import { fillSamples, templateInfo, varLabel } from "@/lib/emailTemplateKit";
import { translateBnToEn } from "@/lib/translate";
import { useToastStore } from "@/store/toast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

const EMPTY: Omit<EmailTemplateRecord, "id" | "created_at" | "updated_at"> = {
  template_name: "",
  subject_en: "",
  subject_bn: "",
  body_en: "",
  body_bn: "",
  variables: [],
  is_active: true,
};

export default function AdminEmailTemplatesPage() {
  const toast = useToastStore((s) => s.push);
  const [templates, setTemplates] = useState<EmailTemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<EmailTemplateRecord> | null>(null);
  useUnsavedGuard(useDirty(editing, editing ? (editing.id ?? "new") : null));
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const [varsInput, setVarsInput] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await emailTemplatesAdminApi.list();
      setTemplates(r.data.data ?? []);
    } catch {
      toast("error", "টেমপ্লেট আনা যায়নি");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing({ ...EMPTY });
    setVarsInput("");
    setIsNew(true);
    setPreviewMode(false);
  };

  const openEdit = (t: EmailTemplateRecord) => {
    setEditing({ ...t });
    setVarsInput((t.variables ?? []).join(", "));
    setIsNew(false);
    setPreviewMode(false);
  };

  const close = () => { setEditing(null); setIsNew(false); setPreviewMode(false); };

  function renderPreview(body: string, variables: string[]) {
    // Safe: only admin-authored text + variable placeholders, no untrusted input
    let result = body;
    for (const v of variables) {
      result = result.replace(new RegExp(`\\{\\{\\s*${v}\\s*\\}\\}`, "g"), `<span class="bg-yellow-100 text-yellow-800 rounded px-1">${fillSamples(`{{${v}}}`, [v])}</span>`);
    }
    result = result.replace(/\n/g, "<br/>");
    return result;
  }

  const handleSave = async () => {
    if (!editing?.template_name?.trim()) {
      toast("error", "টেমপ্লেটের নাম দিন");
      return;
    }
    // Bangla-first: fill empty English subject/body from the Bangla ones.
    let e2 = editing;
    setSaving(true);
    try {
      const patch: Partial<EmailTemplateRecord> = {};
      if (!e2.subject_en?.trim() && e2.subject_bn?.trim()) patch.subject_en = await translateBnToEn(e2.subject_bn);
      if (!e2.body_en?.trim() && e2.body_bn?.trim()) patch.body_en = await translateBnToEn(e2.body_bn);
      if (Object.keys(patch).length) { e2 = { ...e2, ...patch }; setEditing(e2); }
    } catch {
      setSaving(false);
      toast("error", "অটো-অনুবাদ ব্যর্থ — Subject/Body (EN) নিজে লিখুন");
      return;
    }
    if (!e2.subject_en?.trim() || !e2.body_en?.trim()) {
      setSaving(false);
      toast("error", "Subject (EN) ও Body (EN) দিন (বাংলা লিখলে অটো-অনুবাদ হবে)");
      return;
    }
    const payload = {
      ...e2,
      variables: varsInput.split(",").map((v) => v.trim()).filter(Boolean),
    } as Omit<EmailTemplateRecord, "id" | "created_at" | "updated_at">;

    try {
      if (isNew) {
        await emailTemplatesAdminApi.create(payload);
        toast("success", "টেমপ্লেট তৈরি হয়েছে");
      } else {
        await emailTemplatesAdminApi.update(editing.id!, {
          subject_en: payload.subject_en,
          subject_bn: payload.subject_bn,
          body_en: payload.body_en,
          body_bn: payload.body_bn,
          is_active: payload.is_active,
        });
        toast("success", "টেমপ্লেট আপডেট হয়েছে");
      }
      close();
      await load();
    } catch {
      toast("error", "সংরক্ষণ করা যায়নি");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmState({
      title: `Deactivate template "${name}"?`,
      message: "This will deactivate the template. Its content and history will be preserved.",
      action: async () => {
        setConfirmState(null);
        setDeletingId(id);
        try {
          await emailTemplatesAdminApi.delete(id);
          setTemplates((prev) => prev.filter((t) => t.id !== id));
          toast("success", "টেমপ্লেট বন্ধ করা হয়েছে");
        } catch {
          toast("error", "বন্ধ করা যায়নি");
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const toggleActive = async (t: EmailTemplateRecord) => {
    try {
      await emailTemplatesAdminApi.update(t.id, { is_active: !t.is_active });
      setTemplates((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_active: !t.is_active } : x)));
    } catch {
      toast("error", "আপডেট করা যায়নি");
    }
  };

  return (
    <div className="admin-page space-y-5">
      <AdminPageHeader
        title="Email Templates"
        titleBn="ইমেইল টেমপ্লেট"
        description={<>গ্রাহকের কাছে নিজে থেকে যে ইমেইলগুলো যায় — {templates.length}টি। লেখা বদলাতে কার্ডে চাপুন।</>}
        actions={
          <button onClick={openNew} className="btn btn-brand btn-md min-h-11 flex items-center justify-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" /> নতুন টেমপ্লেট
          </button>
        }
      />

      <div className="admin-card overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : templates.length === 0 ? (
          <AdminEmptyState icon={Mail} title="এখনো কোনো ইমেইল টেমপ্লেট নেই" description="প্রথম টেমপ্লেট বানান — গ্রাহক যে ইমেইল পান তা নিজের মতো সাজাতে পারবেন।" />
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
            {templates.map((t) => {
              const info = templateInfo(t.template_name);
              return (
                <article key={t.id} className="admin-surface rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 p-4 shadow-sm">
                  <button type="button" onClick={() => openEdit(t)} className="block min-h-11 w-full text-left">
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block text-base font-semibold text-heading">{info.icon} {info.bn}</span>
                        <span className="block text-xs text-muted mt-0.5">🕒 {info.when}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${t.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{t.is_active ? "চালু" : "বন্ধ"}</span>
                    </span>
                    <span className="mt-2 block break-words text-sm text-gray-700 dark:text-gray-200"><span className="text-muted">বিষয়: </span>{fillSamples(t.subject_bn || t.subject_en, t.variables ?? []) || "—"}</span>
                  </button>
                  {(t.variables ?? []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1 border-t border-gray-100 dark:border-white/10 pt-3">
                      <span className="text-[11px] text-muted mr-1">যে তথ্য নিজে বসে:</span>
                      {(t.variables ?? []).map((v) => <span key={v} className="rounded-full bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-200 px-2 py-0.5 text-[11px]">{varLabel(v)}</span>)}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => openEdit(t)} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-gray-200 dark:border-white/10 px-3 text-xs font-semibold"><Pencil className="h-4 w-4" />লেখা বদলান</button>
                    <button type="button" onClick={() => toggleActive(t)} className="min-h-11 rounded-lg border border-gray-200 dark:border-white/10 px-3 text-xs font-semibold">{t.is_active ? "পাঠানো বন্ধ করুন" : "আবার চালু করুন"}</button>
                  </div>
                </article>
              );
            })}
          </div>
          </>
        )}
      </div>

      {editing && (
        <div className="admin-overlay admin-overlay--panel fixed inset-0 z-50 flex items-center justify-center p-4 max-[640px]:items-end max-[640px]:p-0" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="admin-sheet admin-sheet--l bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl max-[640px]:max-h-[94dvh] max-[640px]:rounded-b-none max-[640px]:rounded-t-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{isNew ? "নতুন টেমপ্লেট" : `${templateInfo(editing.template_name).icon} ${templateInfo(editing.template_name).bn}`}</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewMode((p) => !p)}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${previewMode ? "bg-brand-50 border-brand-200 text-brand-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  {previewMode ? <Code className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {previewMode ? "লিখুন" : "প্রিভিউ"}
                </button>
                <button aria-label="বন্ধ করুন" type="button" onClick={close} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
            </div>
            {previewMode ? (
              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">Subject (EN)</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{editing?.subject_en || "—"}</p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-xs text-gray-500 font-medium mb-2">Body (EN)</p>
                    <div
                      className="text-sm text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: renderPreview(
                          editing?.body_en ?? "",
                          varsInput.split(",").map((v) => v.trim()).filter(Boolean)
                        ),
                      }}
                    />
                  </div>
                </div>
                {editing?.subject_bn && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                      <p className="text-xs text-gray-500 font-medium">Subject (BN)</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{editing.subject_bn}</p>
                    </div>
                    {editing.body_bn && (
                      <div className="px-4 py-4">
                        <p className="text-xs text-gray-500 font-medium mb-2">Body (BN)</p>
                        <div
                          className="text-sm text-gray-700 leading-relaxed"
                          dir="auto"
                          dangerouslySetInnerHTML={{
                            __html: renderPreview(
                              editing.body_bn,
                              varsInput.split(",").map((v) => v.trim()).filter(Boolean)
                            ),
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-400">হলুদ অংশে নমুনা তথ্য দেখানো হয়েছে — আসল ইমেইলে গ্রাহকের নিজের তথ্য বসবে।</p>
              </div>
            ) : (
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {!isNew && <p className="text-xs text-muted rounded-lg bg-gray-50 dark:bg-white/5 px-3 py-2">🕒 {templateInfo(editing.template_name).when}</p>}
              <BnEnText label="ইমেইলের বিষয় (Subject)" required bn={editing.subject_bn} en={editing.subject_en}
                onBn={(v) => setEditing((p) => p ? { ...p, subject_bn: v } : p)} onEn={(v) => setEditing((p) => p ? { ...p, subject_en: v } : p)}
                placeholderBn="যেমন: আপনার অর্ডার পেয়েছি — {{order_number}}" />
              <BnEnText label="ইমেইলের লেখা" required rows={8} bn={editing.body_bn} en={editing.body_en}
                onBn={(v) => setEditing((p) => p ? { ...p, body_bn: v } : p)} onEn={(v) => setEditing((p) => p ? { ...p, body_en: v } : p)}
                placeholderBn="প্রিয় {{customer_name}}, ..." />
              {(isNew ? varsInput.split(",").map((v) => v.trim()).filter(Boolean) : editing.variables ?? []).length > 0 && (
                <div className="rounded-xl border border-[var(--line)] p-3">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1.5">গ্রাহকের তথ্য বসান <span className="font-normal text-muted">(চাপলে বাংলা লেখার শেষে যোগ হবে — ইমেইলে আসল তথ্য দেখাবে)</span></p>
                  <div className="flex flex-wrap gap-1.5">
                    {(isNew ? varsInput.split(",").map((v) => v.trim()).filter(Boolean) : editing.variables ?? []).map((v) => (
                      <button key={v} type="button" onClick={() => setEditing((p) => p ? { ...p, body_bn: `${(p.body_bn ?? "").replace(/\s*$/, "")} {{${v}}}` } : p)}
                        className="rounded-full border border-brand-200 bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-200 px-3 min-h-10 text-xs">+ {varLabel(v)}</button>
                    ))}
                  </div>
                </div>
              )}
              <details className="rounded-xl border border-[var(--line)]" open={isNew}>
                <summary className="cursor-pointer select-none px-3 py-2.5 text-sm text-heading min-h-11 flex items-center">🛠️ টেকনিক্যাল (সাধারণত বদলাতে হয় না)</summary>
                <div className="px-3 pb-3 space-y-3">
                  <div>
                    <label className="form-label">কোড নাম <span className="text-gray-400 font-normal">(সিস্টেম এই নামে ইমেইল খোঁজে — সেভের পর বদলায় না)</span></label>
                    <input value={editing.template_name ?? ""} onChange={(e) => setEditing((p) => p ? { ...p, template_name: e.target.value } : p)} disabled={!isNew}
                      placeholder="order_confirmation" className="input w-full font-mono text-sm disabled:bg-gray-50" />
                  </div>
                  <div>
                    <label className="form-label">তথ্যের নাম <span className="text-gray-400 font-normal">(কমা দিয়ে)</span></label>
                    <input value={varsInput} onChange={(e) => setVarsInput(e.target.value)} placeholder="customer_name, order_number, total" className="input w-full text-sm font-mono" disabled={!isNew} />
                  </div>
                </div>
              </details>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing((p) => p ? { ...p, is_active: e.target.checked } : p)} className="rounded border-gray-300 text-brand-600" />
                <span className="text-sm text-gray-700">এই ইমেইল পাঠানো চালু</span>
              </label>
            </div>
            )}
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button onClick={close} className="btn btn-outline btn-md">বাতিল</button>
              {!previewMode && (
                <button onClick={handleSave} disabled={saving} className="btn btn-brand btn-md">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isNew ? "তৈরি করুন" : "সেভ করুন"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title ?? ""}
        message={confirmState?.message ?? ""}
        confirmLabel="বন্ধ করুন"
        variant="danger"
        onConfirm={() => confirmState?.action()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}