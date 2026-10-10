"use client";

import TranslateButton from "@/components/admin/TranslateButton";
import { useCallback, useEffect, useState } from "react";
import { Trash2, Loader2, FolderKanban, Code2, ExternalLink, Pencil, Copy, X, Save, Send } from "lucide-react";
import { adminApi, type AiDescription } from "@/lib/api";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ImageUpload from "@/components/admin/ImageUpload";
import LivePreview from "@/components/admin/LivePreview";
import AiDescribeButton from "@/components/admin/AiDescribeButton";
import AutoVideo from "@/components/ui/AutoVideo";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import StepForm from "@/components/admin/catalog/StepForm";
import PublishChecklist from "@/components/admin/catalog/PublishChecklist";
import AdvancedSection from "@/components/admin/catalog/AdvancedSection";
import DuplicateNotice from "@/components/admin/catalog/DuplicateNotice";
import AddEntryChoices from "@/components/admin/catalog/AddEntryChoices";
import AiPhotoStartModal, { type AiStartDraft } from "@/components/admin/catalog/AiPhotoStartModal";
import ActiveSwitch from "@/components/admin/catalog/ActiveSwitch";
import { useBnEn } from "@/components/admin/catalog/useBnEn";
import { ADMIN_MODAL_BACKDROP_STYLE, ADMIN_MODAL_PANEL_STYLE } from "@/lib/adminModalStyles";
import { bnNum, shortId, type DupResult } from "@/lib/catalogAdminApi";
import { isVideoUrl } from "@/lib/media";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useToastStore } from "@/store/toast";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SHOWCASE_PROJECTS, DEFAULT_SOFTWARE_SERVICE_CARDS, SHOWCASE_PROJECTS_KEY, SOFTWARE_SERVICE_CARDS_KEY,
  slugify, type ShowcaseProject, type SoftwareServiceCard,
} from "@/lib/showcaseContent";

type Tab = "projects" | "services";
type Bi = { en: string; bn: string };

// Named color presets so the admin picks a swatch, not a Tailwind class.
const GRADIENT_PRESETS: { label: string; value: string; swatch: string }[] = [
  { label: "Green", value: "from-green-500 to-teal-500", swatch: "linear-gradient(to right, #22c55e, #14b8a6)" },
  { label: "Blue", value: "from-blue-500 to-cyan-500", swatch: "linear-gradient(to right, #3b82f6, #06b6d4)" },
  { label: "Purple", value: "from-purple-500 to-indigo-500", swatch: "linear-gradient(to right, #a855f7, #6366f1)" },
  { label: "Orange", value: "from-orange-500 to-amber-500", swatch: "linear-gradient(to right, #f97316, #f59e0b)" },
  { label: "Pink", value: "from-pink-500 to-rose-500", swatch: "linear-gradient(to right, #ec4899, #f43f5e)" },
  { label: "Slate", value: "from-slate-600 to-gray-700", swatch: "linear-gradient(to right, #475569, #374151)" },
];
const ICONS = ["globe", "bot", "cog", "database", "monitor", "code"];

function emptyProject(): ShowcaseProject {
  const id = `project-${Date.now()}`;
  return {
    id, slug: id, title: { en: "", bn: "" }, client: { en: "", bn: "" }, category: { en: "Software", bn: "সফটওয়্যার" },
    technologies: [], problem: { en: "", bn: "" }, solution: { en: "", bn: "" }, result: { en: "", bn: "" },
    image: "", images: [], videoUrl: "", liveUrl: "", featured: true, sortOrder: 0, year: new Date().getFullYear(),
  };
}
function emptyService(): SoftwareServiceCard {
  return { id: `service-${Date.now()}`, icon: "globe", color: "from-brand-500 to-brand-700", title: { en: "", bn: "" }, image: "", items: [{ en: "", bn: "" }], link: "", videoUrl: "" };
}

const norm = (v?: string) => (v || "").trim().replace(/\s+/g, " ").toLowerCase();

type Editor = { kind: "project"; index: number | null; item: ShowcaseProject } | { kind: "service"; index: number | null; item: SoftwareServiceCard };

export default function AdminShowcasePage() {
  const t = useBnEn();
  const toast = useToastStore((s) => s.push);
  const [tab, setTab] = useState<Tab>("projects");
  const [projects, setProjects] = useState<ShowcaseProject[]>([]);
  const [services, setServices] = useState<SoftwareServiceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "project" | "service"; index: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const parse = <T,>(raw: string | undefined, fallback: T[]): T[] => {
      try { return raw?.trim() ? JSON.parse(raw) : [...fallback]; } catch { return [...fallback]; }
    };
    try {
      const data = (await adminApi.getSettings()).data.data ?? {};
      setProjects(parse(data[SHOWCASE_PROJECTS_KEY], DEFAULT_SHOWCASE_PROJECTS));
      setServices(parse(data[SOFTWARE_SERVICE_CARDS_KEY], DEFAULT_SOFTWARE_SERVICE_CARDS));
    } catch {
      setProjects([...DEFAULT_SHOWCASE_PROJECTS]);
      setServices([...DEFAULT_SOFTWARE_SERVICE_CARDS]);
      toast("error", t("কনটেন্ট লোড হয়নি", "Could not load showcase content"));
    } finally { setLoading(false); }
  }, [toast, t]);
  useEffect(() => { load(); }, [load]);

  const open = (e: Editor) => { setEditor(e); setEditorKey((k) => k + 1); };
  const openNew = (kind: "project" | "service", patch?: Partial<AiStartDraft>) => {
    if (kind === "project") {
      const item = emptyProject();
      if (patch) Object.assign(item, { image: patch.image_url ?? "", title: { en: patch.name_en ?? "", bn: patch.name_bn ?? "" }, solution: { en: patch.description_en ?? "", bn: patch.description_bn ?? "" }, slug: slugify(patch.name_en ?? "") || item.slug, hidden: true });
      open({ kind, index: null, item });
    } else {
      const item = emptyService();
      if (patch) Object.assign(item, { image: patch.image_url ?? "", title: { en: patch.name_en ?? "", bn: patch.name_bn ?? "" }, hidden: true });
      open({ kind, index: null, item });
    }
  };

  // Every change is saved straight away (one settings write for both lists).
  const persist = async (nextProjects: ShowcaseProject[], nextServices: SoftwareServiceCard[], okBn: string, okEn: string) => {
    setSaving(true);
    try {
      await adminApi.upsertSettings([
        { key: SHOWCASE_PROJECTS_KEY, value: JSON.stringify(nextProjects), data_type: "json" },
        { key: SOFTWARE_SERVICE_CARDS_KEY, value: JSON.stringify(nextServices), data_type: "json" },
      ]);
      setProjects(nextProjects);
      setServices(nextServices);
      toast("success", t(okBn, okEn));
      return true;
    } catch {
      toast("error", t("সেভ হয়নি — আবার চেষ্টা করুন", "Save failed — try again"));
      return false;
    } finally { setSaving(false); }
  };

  const saveEditor = async (e: Editor) => {
    if (e.kind === "project") {
      const list = [...projects];
      if (e.index === null) list.push(e.item); else list[e.index] = e.item;
      if (await persist(list, services, "প্রজেক্ট সেভ হয়েছে", "Project saved")) setEditor(null);
    } else {
      const list = [...services];
      if (e.index === null) list.push(e.item); else list[e.index] = e.item;
      if (await persist(projects, list, "সার্ভিস কার্ড সেভ হয়েছে", "Service card saved")) setEditor(null);
    }
  };
  const setHidden = (kind: "project" | "service", index: number, hidden: boolean) => {
    if (kind === "project") persist(projects.map((p, i) => (i === index ? { ...p, hidden } : p)), services, hidden ? "লুকানো হয়েছে" : "প্রকাশ হয়েছে", hidden ? "Hidden" : "Published");
    else persist(projects, services.map((s, i) => (i === index ? { ...s, hidden } : s)), hidden ? "লুকানো হয়েছে" : "প্রকাশ হয়েছে", hidden ? "Hidden" : "Published");
  };
  const performDelete = () => {
    if (!deleteTarget) return;
    const { kind, index } = deleteTarget;
    setDeleteTarget(null);
    if (kind === "project") persist(projects.filter((_, i) => i !== index), services, "মুছে ফেলা হয়েছে", "Deleted");
    else persist(projects, services.filter((_, i) => i !== index), "মুছে ফেলা হয়েছে", "Deleted");
  };
  const copyProject = (p: ShowcaseProject) => { const id = `project-${Date.now()}`; open({ kind: "project", index: null, item: { ...p, id, slug: `${p.slug}-copy-${shortId()}`, title: { ...p.title, en: `${p.title.en} (Copy)` }, hidden: true } }); };
  const copyService = (s: SoftwareServiceCard) => open({ kind: "service", index: null, item: { ...s, id: `service-${Date.now()}`, title: { ...s.title, en: `${s.title.en} (Copy)` }, hidden: true } });

  // ?new=1 opens the add form; ?edit=<id or slug> opens that item.
  useEffect(() => {
    if (loading) return;
    const qs = new URLSearchParams(window.location.search);
    const id = qs.get("edit");
    if (id) {
      const pi = projects.findIndex((p) => p.id === id || p.slug === id);
      if (pi >= 0) { setTab("projects"); open({ kind: "project", index: pi, item: projects[pi] }); return; }
      const si = services.findIndex((s) => s.id === id);
      if (si >= 0) { setTab("services"); open({ kind: "service", index: si, item: services[si] }); }
    } else if (qs.get("new") === "1") openNew("project");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const thumb = (src?: string) => src
    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
    ? <img src={src} alt="" className="w-16 h-12 sm:w-20 sm:h-14 rounded-lg object-cover border border-[var(--line)] flex-shrink-0" />
    : <div className="w-16 h-12 sm:w-20 sm:h-14 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0"><FolderKanban className="w-5 h-5 text-gray-400" /></div>;
  const iconBtn = "p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-white/10";

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Project Gallery & Software Services"
        titleBn="প্রজেক্ট গ্যালারি ও সফটওয়্যার সেবা"
        description="Projects, demo photos/videos, live links and software service cards"
        descriptionBn="সফল প্রজেক্ট, ডেমো ছবি/ভিডিও, লাইভ লিংক ও সফটওয়্যার সার্ভিস কার্ড — সেভ চাপলেই সাইটে বদলায়"
        actions={saving ? <span className="text-sm text-muted inline-flex items-center gap-1"><Loader2 className="w-4 h-4 animate-spin" /> {t("সেভ হচ্ছে…", "Saving…")}</span> : undefined}
      />

      <div className="flex gap-2 flex-wrap">
        {([{ id: "projects" as Tab, bn: "প্রজেক্ট গ্যালারি", en: "Project Gallery", icon: FolderKanban, n: projects.length },
          { id: "services" as Tab, bn: "সফটওয়্যার সেবা", en: "Software Services", icon: Code2, n: services.length }]).map(({ id, bn, en, icon: Icon, n }) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
              tab === id ? "bg-brand-600 text-white" : "bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50")}>
            <Icon className="w-4 h-4" /> {t(bn, en)} <span className="opacity-70">({t(bnNum(n), String(n))})</span>
          </button>
        ))}
      </div>

      <AddEntryChoices
        thing={tab === "projects" ? { bn: "প্রজেক্ট", en: "project" } : { bn: "সফটওয়্যার সেবা", en: "software service" }}
        onForm={() => openNew(tab === "projects" ? "project" : "service")}
        onAi={() => setAiOpen(true)}
        large={!loading && (tab === "projects" ? projects.length : services.length) === 0}
      />

      {loading ? (
        <div className="h-64 bg-gray-100 dark:bg-white/5 rounded-2xl animate-pulse" />
      ) : (
        <div className="admin-card divide-y divide-gray-100 dark:divide-white/10">
          {tab === "projects" && projects.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 p-3">
              <button type="button" onClick={() => open({ kind: "project", index: i, item: p })}>{thumb(p.image)}</button>
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => open({ kind: "project", index: i, item: p })} className="block text-left font-medium text-heading truncate max-w-full">{p.title.bn || p.title.en || t("নাম নেই", "Untitled")}</button>
                <p className="text-xs text-muted truncate">{p.category.bn || p.category.en} · {p.year}{p.priceOnRequest ? ` · ${t("দাম আলোচনা সাপেক্ষে", "price on request")}` : p.price ? ` · ৳${p.price}` : ""}</p>
                <div className="sm:hidden mt-1"><ActiveSwitch active={!p.hidden} onChange={(v) => setHidden("project", i, !v)} /></div>
              </div>
              <div className="hidden sm:block"><ActiveSwitch active={!p.hidden} onChange={(v) => setHidden("project", i, !v)} /></div>
              {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className={iconBtn} title={t("লাইভ লিংক", "Live link")}><ExternalLink className="w-4 h-4" /></a>}
              <button type="button" onClick={() => copyProject(p)} className={iconBtn} title={t("কপি করে নতুন বানান", "Copy as new")} aria-label={t("কপি করে নতুন বানান", "Copy as new")}><Copy className="w-4 h-4" /></button>
              <button type="button" onClick={() => open({ kind: "project", index: i, item: p })} className={iconBtn} aria-label={t("সম্পাদনা", "Edit")}><Pencil className="w-4 h-4" /></button>
              <button type="button" onClick={() => setDeleteTarget({ kind: "project", index: i })} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" aria-label={t("মুছুন", "Delete")}><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {tab === "services" && services.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 p-3">
              <button type="button" onClick={() => open({ kind: "service", index: i, item: s })}>{thumb(s.image)}</button>
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => open({ kind: "service", index: i, item: s })} className="block text-left font-medium text-heading truncate max-w-full">{s.title.bn || s.title.en || t("নাম নেই", "Untitled")}</button>
                <p className="text-xs text-muted truncate">{s.items.map((x) => x.bn || x.en).filter(Boolean).join(" · ")}</p>
                <div className="sm:hidden mt-1"><ActiveSwitch active={!s.hidden} onChange={(v) => setHidden("service", i, !v)} /></div>
              </div>
              <div className="hidden sm:block"><ActiveSwitch active={!s.hidden} onChange={(v) => setHidden("service", i, !v)} /></div>
              <button type="button" onClick={() => copyService(s)} className={iconBtn} title={t("কপি করে নতুন বানান", "Copy as new")} aria-label={t("কপি করে নতুন বানান", "Copy as new")}><Copy className="w-4 h-4" /></button>
              <button type="button" onClick={() => open({ kind: "service", index: i, item: s })} className={iconBtn} aria-label={t("সম্পাদনা", "Edit")}><Pencil className="w-4 h-4" /></button>
              <button type="button" onClick={() => setDeleteTarget({ kind: "service", index: i })} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" aria-label={t("মুছুন", "Delete")}><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      {editor && (
        <ShowcaseEditor key={editorKey} editor={editor} projects={projects} services={services} saving={saving}
          onClose={() => setEditor(null)} onSave={saveEditor}
          onOpen={(kind, index) => open(kind === "project" ? { kind, index, item: projects[index] } : { kind, index, item: services[index] })} />
      )}

      <AiPhotoStartModal open={aiOpen} onClose={() => setAiOpen(false)} kind={tab === "projects" ? "project" : "service"}
        folder={tab === "projects" ? "abo-enterprise/projects" : "abo-enterprise/services"}
        onDraft={(d) => { setAiOpen(false); openNew(tab === "projects" ? "project" : "service", d); }} />

      <ConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget?.kind === "project" ? t("প্রজেক্টটি মুছবেন?", "Delete this project?") : t("সার্ভিস কার্ডটি মুছবেন?", "Delete this service card?")}
        message={t("সাথে সাথে সাইট থেকে সরে যাবে। শুধু লুকাতে চাইলে সুইচটি বন্ধ করুন।", "It disappears from the site right away. To only hide it, turn the switch off.")}
        confirmLabel={t("মুছুন", "Delete")}
        variant="danger"
        onConfirm={performDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function BiInput({ label, value, onChange, area, required }: { label: string; value: Bi; onChange: (v: Bi) => void; area?: boolean; required?: boolean }) {
  const t = useBnEn();
  const C = area ? "textarea" : "input";
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label} ({t("বাংলা", "Bangla")}) {required && <span className="text-red-500">*</span>}</label>
        <C className={cn("input text-sm", area && "min-h-[80px] resize-y")} value={value.bn} onChange={(e) => onChange({ ...value, bn: e.target.value })} />
      </div>
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label} (English)</label>
          <TranslateButton bn={value.bn} onResult={(en) => onChange({ ...value, en })} en={value.en} onResultBn={(b) => onChange({ ...value, bn: b })} />
        </div>
        <C className={cn("input text-sm", area && "min-h-[80px] resize-y")} value={value.en} onChange={(e) => onChange({ ...value, en: e.target.value })} />
      </div>
    </div>
  );
}

function PriceFields({ price, onRequest, onChange }: { price?: number | null; onRequest?: boolean; onChange: (p: { price?: number | null; priceOnRequest?: boolean }) => void }) {
  const t = useBnEn();
  return (
    <>
      <label className="flex items-start gap-3 rounded-xl border border-[var(--line)] p-3 cursor-pointer">
        <input type="checkbox" className="rounded mt-0.5" checked={!!onRequest} onChange={(e) => onChange({ priceOnRequest: e.target.checked })} />
        <span>
          <span className="block text-sm font-semibold text-heading">{t("দাম আলোচনা সাপেক্ষে", "Price on request")}</span>
          <span className="block text-xs text-muted">{t("টিক দিলে দামের জায়গায় \"আলোচনা সাপেক্ষে\" দেখাবে।", "Shows \"on request\" instead of a price.")}</span>
        </span>
      </label>
      {!onRequest && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("শুরুর দাম ৳ (ঐচ্ছিক)", "Starting price ৳ (optional)")}</label>
          <input type="number" min={0} inputMode="numeric" className="input" value={price ?? ""} onChange={(e) => onChange({ price: e.target.value === "" ? null : Number(e.target.value) })} />
        </div>
      )}
    </>
  );
}

function ShowcaseEditor({ editor, projects, services, saving, onClose, onSave, onOpen }: {
  editor: Editor;
  projects: ShowcaseProject[];
  services: SoftwareServiceCard[];
  saving: boolean;
  onClose: () => void;
  onSave: (e: Editor) => void;
  onOpen: (kind: "project" | "service", index: number) => void;
}) {
  const t = useBnEn();
  const ref = useFocusTrap(true, onClose);
  const [ed, setEd] = useState<Editor>(editor);
  const isProject = ed.kind === "project";
  const p = ed.item as ShowcaseProject;
  const s = ed.item as SoftwareServiceCard;
  const setP = (patch: Partial<ShowcaseProject>) => setEd((cur) => ({ ...cur, item: { ...(cur.item as ShowcaseProject), ...patch } }) as Editor);
  const setS = (patch: Partial<SoftwareServiceCard>) => setEd((cur) => ({ ...cur, item: { ...(cur.item as SoftwareServiceCard), ...patch } }) as Editor);
  const title = ed.item.title;

  // Local "already exists?" check against the saved lists.
  const others = (isProject ? projects : services).map((x, i) => ({ x, i })).filter(({ i }) => i !== ed.index);
  const n = [norm(title.bn), norm(title.en)].filter((v) => v.length >= 3);
  const dup: DupResult = {
    name_matches: others.filter(({ x }) => n.some((v) => v === norm(x.title.bn) || v === norm(x.title.en)))
      .map(({ x, i }) => ({ id: String(i), name_bn: x.title.bn, name_en: x.title.en, exact: true })),
    slug_taken: isProject ? (() => { const o = others.find(({ x }) => (x as ShowcaseProject).slug === p.slug); return o ? { id: String(o.i), name_bn: o.x.title.bn, name_en: o.x.title.en } : null; })() : null,
    sku_taken: null,
  };
  const openDup = (m: { id: string }) => onOpen(isProject ? "project" : "service", Number(m.id));

  const desc = isProject ? !!(p.problem.bn || p.solution.bn || p.result.bn || p.solution.en) : s.items.some((x) => x.bn || x.en);
  const checks = [
    { bn: "ছবি", en: "Photo", ok: !!ed.item.image },
    { bn: "দাম", en: "Price", ok: !!ed.item.priceOnRequest || (ed.item.price ?? 0) > 0 },
    { bn: "বিবরণ", en: "Description", ok: desc },
    { bn: "ক্যাটাগরি", en: "Category", ok: isProject ? !!(p.category.bn || p.category.en) : !!s.icon },
  ];

  const applyAi = (d: AiDescription) => {
    if (isProject) setP({ solution: { bn: d.description_bn, en: d.description_en }, result: p.result.bn || p.result.en ? p.result : { bn: d.features_bn.join("\n"), en: d.features_en.join("\n") } });
    else setS({ items: d.features_en.map((en, i) => ({ en, bn: d.features_bn[i] ?? "" })) });
  };

  const save = (publish: boolean) => {
    if (!(title.bn.trim() || title.en.trim())) { alert(t("আগে নাম লিখুন", "Enter a name first")); return; }
    if (dup.slug_taken) { alert(t("এই ওয়েব ঠিকানা (slug) আগে থেকেই আছে — 'উন্নত' অংশে বদলান", "This slug already exists — change it under Advanced")); return; }
    if (publish && checks.some((c) => !c.ok) && !window.confirm(t(`${checks.filter((c) => !c.ok).map((c) => c.bn).join(", ")} বাকি — তবুও প্রকাশ করবেন?`, "Some info is missing — publish anyway?"))) return;
    const item = { ...ed.item, hidden: !publish, title: { bn: title.bn.trim() || title.en.trim(), en: title.en.trim() || title.bn.trim() } };
    if (isProject && (item as ShowcaseProject).slug.startsWith("project-")) (item as ShowcaseProject).slug = slugify(item.title.en) || (item as ShowcaseProject).slug;
    onSave({ ...ed, item } as Editor);
  };

  const preview = isProject ? (
    <LivePreview>
      <div className="p-1 pointer-events-none max-w-sm mx-auto">
        <article className="enterprise-card overflow-hidden">
          <div className="relative aspect-video bg-brand-50 dark:bg-white/5">
            {p.videoUrl && isVideoUrl(p.videoUrl) && !/youtu|vimeo/i.test(p.videoUrl) ? (
              <AutoVideo src={p.videoUrl} poster={p.image || undefined} className="absolute inset-0 w-full h-full object-cover" />
            ) : p.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- live admin preview
              <img src={p.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : null}
            {p.videoUrl && <span className="absolute top-2 right-2 text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full">▶ ভিডিও</span>}
          </div>
          <div className="p-4">
            {p.category.bn && <span className="inline-block px-2.5 py-0.5 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 text-xs font-semibold rounded-full mb-2">{p.category.bn}</span>}
            <h3 className="text-lg font-bold text-heading mb-1 line-clamp-2">{p.title.bn || p.title.en || "প্রজেক্ট শিরোনাম"}</h3>
            {p.client.bn && <p className="text-sm text-muted">{p.client.bn}</p>}
          </div>
        </article>
      </div>
    </LivePreview>
  ) : (
    <LivePreview>
      <div className="p-1 pointer-events-none max-w-sm mx-auto">
        <article className="enterprise-card overflow-hidden">
          <div className={cn("h-2 bg-gradient-to-r", s.color)} />
          {s.image && (
            // eslint-disable-next-line @next/next/no-img-element -- live admin preview
            <img src={s.image} alt="" className="w-full aspect-video object-cover" />
          )}
          <div className="p-4">
            <h3 className="text-lg font-bold text-heading mb-2">{s.title.bn || s.title.en || "সেবার নাম"}</h3>
            <ul className="text-sm text-muted space-y-1">{s.items.filter((x) => x.bn || x.en).map((x, i) => <li key={i}>• {x.bn || x.en}</li>)}</ul>
          </div>
        </article>
      </div>
    </LivePreview>
  );

  const steps = isProject ? [
    { id: "basic", bn: "মূল তথ্য", en: "Basics", status: (title.bn || title.en ? "ok" : "warn") as "ok" | "warn", content: (<>
      <BiInput label={t("প্রজেক্টের নাম", "Project name")} value={p.title} onChange={(v) => setP({ title: v })} required />
      <DuplicateNotice result={dup} onOpen={openDup} />
      <BiInput label={t("ক্লায়েন্ট", "Client")} value={p.client} onChange={(v) => setP({ client: v })} />
      <BiInput label={t("ক্যাটাগরি", "Category")} value={p.category} onChange={(v) => setP({ category: v })} />
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("সাল", "Year")}</label><input type="number" className="input" value={p.year} onChange={(e) => setP({ year: Number(e.target.value) })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("প্রযুক্তি (কমা দিয়ে)", "Technologies (comma-separated)")}</label>
          <input className="input" value={p.technologies.join(", ")} onChange={(e) => setP({ technologies: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></div>
      </div>
    </>) },
    { id: "photos", bn: "ছবি ও ভিডিও", en: "Photos & video", status: (p.image ? "ok" : "warn") as "ok" | "warn", content: (<>
      <ImageUpload label={t("কভার ছবি", "Cover image")} value={p.image} onChange={(url) => setP({ image: url })} folder="abo-enterprise/projects" purpose="project" />
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">{t("আরও স্ক্রিনশট", "More screenshots")}</label>
          <button type="button" onClick={() => setP({ images: [...p.images, ""] })} className="text-xs text-brand-600 font-medium">+ {t("ছবি যোগ করুন", "Add photo")}</button>
        </div>
        <div className="space-y-3">
          {p.images.map((url, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1"><ImageUpload value={url} onChange={(v) => setP({ images: p.images.map((u, j) => (j === i ? v : u)) })} folder="abo-enterprise/projects" previewSize="sm" showUrlInput purpose="project" /></div>
              <button type="button" onClick={() => setP({ images: p.images.filter((_, j) => j !== i) })} className="p-2 text-gray-400 hover:text-red-500" aria-label={t("সরান", "Remove")}><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("ডেমো ভিডিও লিংক (YouTube/Vimeo)", "Demo video URL")}</label><input className="input" placeholder="https://youtube.com/watch?v=..." value={p.videoUrl ?? ""} onChange={(e) => setP({ videoUrl: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("লাইভ প্রজেক্ট লিংক", "Live project URL")}</label><input className="input" placeholder="https://..." value={p.liveUrl ?? ""} onChange={(e) => setP({ liveUrl: e.target.value })} /></div>
      </div>
    </>) },
    { id: "price", bn: "দাম", en: "Price", status: (checks[1].ok ? "ok" : "warn") as "ok" | "warn", content: <PriceFields price={p.price} onRequest={p.priceOnRequest} onChange={setP} /> },
    { id: "desc", bn: "বিবরণ", en: "Description", status: (desc ? "ok" : "warn") as "ok" | "warn", content: (<>
      <div className="flex justify-end"><AiDescribeButton kind="showcase" name={title.bn || title.en} notes={[p.client.en, p.technologies.join(", ")].filter(Boolean).join("\n")} onResult={applyAi} /></div>
      <BiInput label={t("সমস্যা (কী দরকার ছিল)", "Problem")} value={p.problem} onChange={(v) => setP({ problem: v })} area />
      <BiInput label={t("সমাধান (কী বানিয়েছি)", "Solution")} value={p.solution} onChange={(v) => setP({ solution: v })} area />
      <BiInput label={t("ফলাফল", "Result")} value={p.result} onChange={(v) => setP({ result: v })} area />
    </>) },
  ] : [
    { id: "basic", bn: "মূল তথ্য", en: "Basics", status: (title.bn || title.en ? "ok" : "warn") as "ok" | "warn", content: (<>
      <BiInput label={t("সেবার নাম", "Service name")} value={s.title} onChange={(v) => setS({ title: v })} required />
      <DuplicateNotice result={dup} onOpen={openDup} />
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("আইকন", "Icon")}</label>
          <select className="input" value={s.icon} onChange={(e) => setS({ icon: e.target.value })}>{ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("রঙ", "Colour")}</label>
          <div className="flex flex-wrap gap-1.5">{GRADIENT_PRESETS.map((g) => (
            <button key={g.value} type="button" onClick={() => setS({ color: g.value })} title={g.label} aria-label={g.label}
              className={cn("w-8 h-8 rounded-lg border-2", s.color === g.value ? "border-gray-800 dark:border-white" : "border-transparent")} style={{ background: g.swatch }} />
          ))}</div></div>
      </div>
    </>) },
    { id: "photos", bn: "ছবি ও ভিডিও", en: "Photos & video", status: (s.image ? "ok" : "warn") as "ok" | "warn", content: (<>
      <ImageUpload label={t("সেবার ছবি", "Service image")} value={s.image ?? ""} onChange={(url) => setS({ image: url })} folder="abo-enterprise/services" purpose="service-image" />
      <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("ভিডিও লিংক (ঐচ্ছিক)", "Video URL (optional)")}</label><input className="input" value={s.videoUrl ?? ""} onChange={(e) => setS({ videoUrl: e.target.value })} /></div>
    </>) },
    { id: "price", bn: "দাম", en: "Price", status: (checks[1].ok ? "ok" : "warn") as "ok" | "warn", content: <PriceFields price={s.price} onRequest={s.priceOnRequest} onChange={setS} /> },
    { id: "desc", bn: "বিবরণ", en: "Description", status: (desc ? "ok" : "warn") as "ok" | "warn", content: (<>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-700">{t("কী কী করা হয় (প্রতি লাইনে একটি)", "What's included (one per row)")}</p>
        <AiDescribeButton kind="software" name={title.bn || title.en} onResult={applyAi} />
      </div>
      {s.items.map((it, i) => (
        <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <input className="input text-sm flex-1 min-w-[140px]" placeholder="বাংলা" value={it.bn} onChange={(e) => setS({ items: s.items.map((x, j) => (j === i ? { ...x, bn: e.target.value } : x)) })} />
          <input className="input text-sm flex-1 min-w-[140px]" placeholder="English" value={it.en} onChange={(e) => setS({ items: s.items.map((x, j) => (j === i ? { ...x, en: e.target.value } : x)) })} />
          <TranslateButton bn={it.bn} onResult={(en) => setS({ items: s.items.map((x, j) => (j === i ? { ...x, en } : x)) })} en={it.en} onResultBn={(b) => setS({ items: s.items.map((x, j) => (j === i ? { ...x, bn: b } : x)) })} />
          <button type="button" onClick={() => setS({ items: s.items.filter((_, j) => j !== i) })} className="p-2 text-gray-400 hover:text-red-500" aria-label={t("সরান", "Remove")}><X className="w-4 h-4" /></button>
        </div>
      ))}
      <button type="button" onClick={() => setS({ items: [...s.items, { en: "", bn: "" }] })} className="text-xs text-brand-600 font-medium">+ {t("লাইন যোগ করুন", "Add row")}</button>
    </>) },
  ];
  steps.push({ id: "publish", bn: "প্রকাশ", en: "Publish", status: (checks.every((c) => c.ok) ? "ok" : "warn") as "ok" | "warn", content: (<>
    {preview}
    <PublishChecklist items={checks} />
    {isProject && <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="rounded" checked={!!p.featured} onChange={(e) => setP({ featured: e.target.checked })} /> {t("ফিচার করুন", "Featured")}</label>}
    <AdvancedSection>
      {isProject ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">{t("ওয়েব ঠিকানা (slug)", "Web address (slug)")}</label><input className="input font-mono text-sm" value={p.slug} onChange={(e) => setP({ slug: slugify(e.target.value) })} /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">{t("ক্রম (ছোট সংখ্যা আগে)", "Sort order")}</label><input type="number" className="input" value={p.sortOrder ?? 0} onChange={(e) => setP({ sortOrder: Number(e.target.value) })} /></div>
          <div className="sm:col-span-2"><DuplicateNotice result={dup} onOpen={openDup} show="codes" /></div>
        </div>
      ) : (
        <div><label className="block text-xs font-medium text-gray-600 mb-1">{t("লিংক (কার্ডে চাপলে কোথায় যাবে)", "Link (where the card goes)")}</label><input className="input text-sm" value={s.link ?? ""} onChange={(e) => setS({ link: e.target.value })} placeholder="/services/..." /></div>
      )}
    </AdvancedSection>
  </>) });

  const heading = ed.index === null ? (isProject ? t("নতুন প্রজেক্ট", "New project") : t("নতুন সফটওয়্যার সেবা", "New software service")) : (isProject ? t("প্রজেক্ট সম্পাদনা", "Edit project") : t("সার্ভিস কার্ড সম্পাদনা", "Edit service card"));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4" style={ADMIN_MODAL_BACKDROP_STYLE}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={heading} className="w-full max-w-3xl h-full sm:h-[92vh] sm:rounded-2xl flex flex-col" style={ADMIN_MODAL_PANEL_STYLE}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-white/10">
          <h2 className="text-lg font-semibold text-heading">{heading}</h2>
          <button type="button" onClick={onClose} aria-label={t("বন্ধ করুন", "Close")} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div data-step-scroll className="flex-1 overflow-y-auto px-4 sm:px-6 py-4"><StepForm steps={steps} /></div>
        <div className="px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-white/10 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-outline btn-md">{t("বাতিল", "Cancel")}</button>
          <button type="button" onClick={() => save(false)} disabled={saving} className="btn btn-outline btn-md gap-1.5"><Save className="w-4 h-4" /> {t("খসড়া হিসেবে সেভ", "Save as draft")}</button>
          <button type="button" onClick={() => save(true)} disabled={saving} className="btn btn-brand btn-md gap-1.5">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {t("সেভ ও প্রকাশ", "Save & publish")}</button>
        </div>
      </div>
    </div>
  );
}
