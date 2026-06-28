"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Mail, Plus, Pencil, Trash2, X, CheckCircle, XCircle, Eye, Code } from "lucide-react";
import { emailTemplatesAdminApi, type EmailTemplateRecord } from "@/lib/api";
import { useToastStore } from "@/store/toast";

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
    let result = body;
    for (const v of variables) {
      result = result.replace(new RegExp(`\\{\\{\\s*${v}\\s*\\}\\}`, "g"), `<span class="bg-yellow-100 text-yellow-800 rounded px-1 font-mono text-xs">[${v}]</span>`);
    }
    result = result.replace(/\n/g, "<br/>");
    return result;
  }

  const handleSave = async () => {
    if (!editing?.template_name?.trim() || !editing.subject_en?.trim() || !editing.body_en?.trim()) {
      toast("error", "Template name, subject (EN) and body (EN) are required");
      return;
    }
    const payload = {
      ...editing,
      variables: varsInput.split(",").map((v) => v.trim()).filter(Boolean),
    } as Omit<EmailTemplateRecord, "id" | "created_at" | "updated_at">;

    setSaving(true);
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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"?`)) return;
    setDeletingId(id);
    try {
      await emailTemplatesAdminApi.delete(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast("success", "Template deleted");
    } catch {
      toast("error", "Delete failed");
    } finally {
      setDeletingId(null);
    }
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
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Mail className="w-6 h-6 text-brand-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
            <p className="text-gray-500 text-sm">{templates.length} templates</p>
          </div>
        </div>
        <button onClick={openNew} className="btn btn-brand btn-md flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No email templates yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-premium min-w-[560px]">
              <thead>
                <tr>
                  <th>Template</th>
                  <th>Subject (EN)</th>
                  <th className="hidden sm:table-cell">Variables</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} onClick={() => openEdit(t)} className="cursor-pointer hover:bg-brand-50/40 transition-colors">
                    <td className="font-mono text-sm">{t.template_name}</td>
                    <td className="text-gray-700 max-w-xs truncate">{t.subject_en}</td>
                    <td className="text-xs text-gray-400 hidden sm:table-cell">{(t.variables ?? []).join(", ") || "—"}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleActive(t)} title={t.is_active ? "Deactivate" : "Activate"}>
                        {t.is_active
                          ? <CheckCircle className="w-5 h-5 text-green-500" />
                          : <XCircle className="w-5 h-5 text-gray-300" />}
                      </button>
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(t)} className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg hover:bg-brand-50">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.template_name)}
                          disabled={deletingId === t.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-40"
                        >
                          {deletingId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Subject (EN)</label>
                  <input value={editing.subject_en ?? ""} onChange={(e) => setEditing((p) => p ? { ...p, subject_en: e.target.value } : p)} className="input w-full text-sm" />
                </div>
                <div>
                  <label className="form-label">Subject (বাংলা)</label>
                  <input value={editing.subject_bn ?? ""} onChange={(e) => setEditing((p) => p ? { ...p, subject_bn: e.target.value } : p)} className="input w-full text-sm" dir="auto" />
                </div>
              </div>
              <div>
                <label className="form-label">Body (EN)</label>
                <textarea rows={6} value={editing.body_en ?? ""} onChange={(e) => setEditing((p) => p ? { ...p, body_en: e.target.value } : p)} className="input w-full resize-y text-sm font-mono" placeholder="Hello {{customer_name}}, ..." />
              </div>
              <div>
                <label className="form-label">Body (বাংলা)</label>
                <textarea rows={5} value={editing.body_bn ?? ""} onChange={(e) => setEditing((p) => p ? { ...p, body_bn: e.target.value } : p)} className="input w-full resize-y text-sm" dir="auto" />
              </div>
              <div>
                <label className="form-label">Variables <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                <input value={varsInput} onChange={(e) => setVarsInput(e.target.value)} placeholder="customer_name, order_number, total" className="input w-full text-sm" disabled={!isNew} />
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
    </div>
  );
}
