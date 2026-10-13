"use client";

import { useEffect, useState, useCallback } from "react";
import AdminTitle from "@/components/admin/AdminTitle";
import { Loader2, Mail, Plus, Pencil, Ban, X, CheckCircle, XCircle, Eye, Code } from "lucide-react";
import { emailTemplatesAdminApi, type EmailTemplateRecord } from "@/lib/api";
import TranslateButton from "@/components/admin/TranslateButton";
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
      toast("error", "Failed to load templates");
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
      result = result.replace(new RegExp(`\\{\\{\\s*${v}\\s*\\}\\}`, "g"), `<span class="bg-yellow-100 text-yellow-800 rounded px-1 font-mono text-xs">[${v}]</span>`);
    }
    result = result.replace(/\n/g, "<br/>");
    return result;
  }

  const handleSave = async () => {
    if (!editing?.template_name?.trim()) {
      toast("error", "Template name is required");
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
        toast("success", "Template created");
      } else {
        await emailTemplatesAdminApi.update(editing.id!, {
          subject_en: payload.subject_en,
          subject_bn: payload.subject_bn,
          body_en: payload.body_en,
          body_bn: payload.body_bn,
          is_active: payload.is_active,
        });
        toast("success", "Template updated");
      }
      close();
      await load();
    } catch {
      toast("error", "Save failed");
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
          toast("success", "Template deactivated");
        } catch {
          toast("error", "Deactivation failed");
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
      toast("error", "Update failed");
    }
  };

  return (
    <div className="admin-page space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-brand-100 bg-brand-50 text-brand-700"><Mail className="h-5 w-5" /></span>
          <div>
            <AdminTitle en="Email Templates" bn="ইমেইল টেমপ্লেট" />
            <p className="text-gray-500 text-sm">{templates.length} templates</p>
          </div>
        </div>
        <button onClick={openNew} className="btn btn-brand btn-md min-h-11 flex items-center justify-center gap-2 whitespace-nowrap">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      <div className="admin-card overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : templates.length === 0 ? (
          <AdminEmptyState icon={Mail} title="No email templates yet" description="Create your first template to customize the emails customers receive." />
        ) : (
          <>
          <div className="space-y-3 p-3 min-[641px]:hidden">
            {templates.map((t) => (
              <article key={t.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <button type="button" onClick={() => openEdit(t)} className="block min-h-11 w-full text-left">
                  <span className="flex items-start justify-between gap-3"><span className="min-w-0 break-all font-mono text-sm font-semibold text-gray-900">{t.template_name}</span><span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${t.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{t.is_active ? "Active" : "Inactive"}</span></span>
                  <span className="mt-2 block break-words text-sm text-gray-700">{t.subject_en || "—"}</span>
                </button>
                <p className="mt-3 break-words border-t border-gray-100 pt-3 text-xs text-gray-500"><span className="font-semibold text-gray-700">Variables: </span>{(t.variables ?? []).join(", ") || "—"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => toggleActive(t)} className="min-h-11 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700">{t.is_active ? "Deactivate" : "Activate"}</button>
                  <button type="button" onClick={() => openEdit(t)} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700"><Pencil className="h-4 w-4" />Edit</button>
                  <button type="button" onClick={() => handleDelete(t.id, t.template_name)} disabled={deletingId === t.id} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-amber-100 px-3 text-xs font-semibold text-amber-700 disabled:opacity-40"><Ban className="h-4 w-4" />Deactivate</button>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden min-[641px]:block overflow-x-auto">
            <table className="table-premium table-responsive min-[641px]:min-w-0 min-[641px]:min-w-[560px] min-w-0 min-[641px]:min-w-[560px]">
              <thead>
                <tr>
                  <th>Template</th>
                  <th>Subject (EN)</th>
                  <th>Variables</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} onClick={() => openEdit(t)} className="cursor-pointer hover:bg-brand-50/40 transition-colors">
                    <td className="font-mono text-sm" data-label="Template">{t.template_name}</td>
                    <td className="text-gray-700 max-w-xs truncate" data-label="Subject (EN)">{t.subject_en}</td>
                    <td className="text-xs text-gray-400" data-label="Variables">{(t.variables ?? []).join(", ") || "—"}</td>
                    <td data-label="Status" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleActive(t)} title={t.is_active ? "Deactivate" : "Activate"}>
                        {t.is_active
                          ? <CheckCircle className="w-5 h-5 text-green-500" />
                          : <XCircle className="w-5 h-5 text-gray-300" />}
                      </button>
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1 flex-wrap">
                        <button onClick={() => openEdit(t)} className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg hover:bg-brand-50">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.template_name)}
                          disabled={deletingId === t.id}
                          aria-label={`Deactivate ${t.template_name} template`}
                          title="Deactivate (keeps the template and its history)"
                          className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 disabled:opacity-40"
                        >
                          {deletingId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 max-[640px]:items-end max-[640px]:p-0" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl max-[640px]:max-h-[94dvh] max-[640px]:rounded-b-none max-[640px]:rounded-t-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{isNew ? "New Template" : "Edit Template"}</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewMode((p) => !p)}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${previewMode ? "bg-brand-50 border-brand-200 text-brand-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  {previewMode ? <Code className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {previewMode ? "Edit" : "Preview"}
                </button>
                <button onClick={close} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
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
                <p className="text-xs text-gray-400">Variables shown as <span className="bg-yellow-100 text-yellow-800 rounded px-1 font-mono">[name]</span> placeholders.</p>
              </div>
            ) : (
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              <div>
                <label className="form-label">Template Name (unique key)</label>
                <input
                  value={editing.template_name ?? ""}
                  onChange={(e) => setEditing((p) => p ? { ...p, template_name: e.target.value } : p)}
                  disabled={!isNew}
                  placeholder="order_confirmation"
                  className="input w-full font-mono text-sm disabled:bg-gray-50"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label flex items-center justify-between gap-2">
                    Subject (EN)
                    <TranslateButton bn={editing.subject_bn} onResult={(en) => setEditing((p) => p ? { ...p, subject_en: en } : p)} en={editing.subject_en} onResultBn={(b) => setEditing((p) => p ? { ...p, subject_bn: b } : p)} />
                  </label>
                  <input value={editing.subject_en ?? ""} onChange={(e) => setEditing((p) => p ? { ...p, subject_en: e.target.value } : p)} className="input w-full text-sm" />
                </div>
                <div>
                  <label className="form-label">Subject (বাংলা)</label>
                  <input value={editing.subject_bn ?? ""} onChange={(e) => setEditing((p) => p ? { ...p, subject_bn: e.target.value } : p)} className="input w-full text-sm" dir="auto" />
                </div>
              </div>
              <div>
                <label className="form-label flex items-center justify-between gap-2">
                  Body (EN)
                  <TranslateButton bn={editing.body_bn} onResult={(en) => setEditing((p) => p ? { ...p, body_en: en } : p)} en={editing.body_en} onResultBn={(b) => setEditing((p) => p ? { ...p, body_bn: b } : p)} />
                </label>
                <textarea rows={6} value={editing.body_en ?? ""} onChange={(e) => setEditing((p) => p ? { ...p, body_en: e.target.value } : p)} className="input w-full resize-y text-sm font-mono" placeholder="Hello {{customer_name}}, ..." />
              </div>
              <div>
                <label className="form-label">Body (বাংলা)</label>
                <textarea rows={5} value={editing.body_bn ?? ""} onChange={(e) => setEditing((p) => p ? { ...p, body_bn: e.target.value } : p)} className="input w-full resize-y text-sm" dir="auto" />
              </div>
              <div>
                <label className="form-label">Variables <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                <input value={varsInput} onChange={(e) => setVarsInput(e.target.value)} placeholder="customer_name, order_number, total" className="input w-full text-sm" disabled={!isNew} />
                {varsInput.trim() && (
                  <p className="text-xs text-gray-400 mt-1">
                    Use in body:{" "}
                    {varsInput.split(",").map((v) => v.trim()).filter(Boolean).map((v) => (
                      <code key={v} className="bg-gray-100 px-1 rounded mr-1">{`{{${v}}}`}</code>
                    ))}
                  </p>
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing((p) => p ? { ...p, is_active: e.target.checked } : p)} className="rounded border-gray-300 text-brand-600" />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
            )}
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button onClick={close} className="btn btn-outline btn-md">Cancel</button>
              {!previewMode && (
                <button onClick={handleSave} disabled={saving} className="btn btn-brand btn-md">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isNew ? "Create" : "Save"}
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
        confirmLabel="Deactivate"
        variant="danger"
        onConfirm={() => confirmState?.action()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}