"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  Check,
  FolderKanban,
  Code2,
  GripVertical,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ImageUpload from "@/components/admin/ImageUpload";
import { useToastStore } from "@/store/toast";
import {
  DEFAULT_SHOWCASE_PROJECTS,
  DEFAULT_SOFTWARE_SERVICE_CARDS,
  SHOWCASE_PROJECTS_KEY,
  SOFTWARE_SERVICE_CARDS_KEY,
  slugify,
  type ShowcaseProject,
  type SoftwareServiceCard,
} from "@/lib/showcaseContent";

type Tab = "projects" | "services";

function emptyProject(): ShowcaseProject {
  const id = `project-${Date.now()}`;
  return {
    id,
    slug: id,
    title: { en: "", bn: "" },
    client: { en: "", bn: "" },
    category: { en: "Software", bn: "সফটওয়্যার" },
    technologies: [],
    problem: { en: "", bn: "" },
    solution: { en: "", bn: "" },
    result: { en: "", bn: "" },
    image: "",
    images: [],
    videoUrl: "",
    liveUrl: "",
    featured: true,
    sortOrder: 0,
    year: new Date().getFullYear(),
  };
}

function emptyService(): SoftwareServiceCard {
  return {
    id: `service-${Date.now()}`,
    icon: "globe",
    color: "from-brand-500 to-brand-700",
    title: { en: "", bn: "" },
    image: "",
    items: [{ en: "", bn: "" }],
    link: "",
    videoUrl: "",
  };
}

export default function AdminShowcasePage() {
  const toast = useToastStore((s) => s.push);
  const [tab, setTab] = useState<Tab>("projects");
  const [projects, setProjects] = useState<ShowcaseProject[]>([]);
  const [services, setServices] = useState<SoftwareServiceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSettings();
      const data = res.data.data ?? {};
      try {
        const p = data[SHOWCASE_PROJECTS_KEY]?.trim();
        setProjects(p ? JSON.parse(p) : [...DEFAULT_SHOWCASE_PROJECTS]);
      } catch {
        setProjects([...DEFAULT_SHOWCASE_PROJECTS]);
      }
      try {
        const s = data[SOFTWARE_SERVICE_CARDS_KEY]?.trim();
        setServices(s ? JSON.parse(s) : [...DEFAULT_SOFTWARE_SERVICE_CARDS]);
      } catch {
        setServices([...DEFAULT_SOFTWARE_SERVICE_CARDS]);
      }
    } catch {
      setProjects([...DEFAULT_SHOWCASE_PROJECTS]);
      setServices([...DEFAULT_SOFTWARE_SERVICE_CARDS]);
      toast("error", "Could not load showcase content");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.upsertSettings([
        { key: SHOWCASE_PROJECTS_KEY, value: JSON.stringify(projects), data_type: "string" },
        { key: SOFTWARE_SERVICE_CARDS_KEY, value: JSON.stringify(services), data_type: "string" },
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast("success", "Showcase content saved");
    } catch {
      toast("error", "Save failed — try again");
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const updateProject = (index: number, patch: Partial<ShowcaseProject>) => {
    setProjects((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const updateService = (index: number, patch: Partial<SoftwareServiceCard>) => {
    setServices((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Project Gallery & Software Services"
        titleBn="প্রজেক্ট গ্যালারি ও সফটওয়্যার সেবা"
        description="সফল প্রজেক্ট, ডেমো ছবি/ভিডিও, লাইভ লিংক ও সফটওয়্যার সার্ভিস কার্ড ম্যানেজ করুন"
        actions={
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className={`admin-btn-primary !py-2 ${saved ? "!bg-green-600" : ""}`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : saved ? "Saved!" : "Save All"}
          </button>
        }
      />

      <div className="flex gap-2 flex-wrap">
        {([
          { id: "projects" as Tab, label: "Project Gallery", icon: FolderKanban },
          { id: "services" as Tab, label: "Software Services", icon: Code2 },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === id ? "bg-brand-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      ) : tab === "projects" ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{projects.length} project(s) — shown on /projects and /gallery</p>
            <button type="button" onClick={() => setProjects((p) => [...p, emptyProject()])} className="admin-btn-secondary !py-1.5 text-sm">
              <Plus className="w-4 h-4" /> Add Project
            </button>
          </div>

          {projects.map((project, index) => {
            const open = expanded[project.id] ?? index === 0;
            return (
              <div key={project.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/80 border-b border-gray-100">
                  <GripVertical className="w-4 h-4 text-gray-300" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{project.title.en || "New Project"}</p>
                    <p className="text-xs text-gray-400">/{project.slug}</p>
                  </div>
                  <button type="button" onClick={() => toggleExpand(project.id)} className="p-1.5 rounded-lg hover:bg-gray-200/60">
                    {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjects((p) => p.filter((_, i) => i !== index))}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                    aria-label="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {open && (
                  <div className="p-4 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Field label="Title (English)">
                        <input
                          className="input text-sm"
                          value={project.title.en}
                          onChange={(e) => {
                            const en = e.target.value;
                            updateProject(index, {
                              title: { ...project.title, en },
                              slug: project.slug.startsWith("project-") ? slugify(en) || project.slug : project.slug,
                            });
                          }}
                        />
                      </Field>
                      <Field label="Title (বাংলা)">
                        <input className="input text-sm" value={project.title.bn} onChange={(e) => updateProject(index, { title: { ...project.title, bn: e.target.value } })} />
                      </Field>
                      <Field label="Slug">
                        <input className="input text-sm" value={project.slug} onChange={(e) => updateProject(index, { slug: slugify(e.target.value) })} />
                      </Field>
                      <Field label="Year">
                        <input type="number" className="input text-sm" value={project.year} onChange={(e) => updateProject(index, { year: Number(e.target.value) })} />
                      </Field>
                      <Field label="Live Project URL">
                        <input className="input text-sm" placeholder="https://..." value={project.liveUrl ?? ""} onChange={(e) => updateProject(index, { liveUrl: e.target.value })} />
                      </Field>
                      <Field label="Demo Video URL (YouTube/Vimeo)">
                        <input className="input text-sm" placeholder="https://youtube.com/watch?v=..." value={project.videoUrl ?? ""} onChange={(e) => updateProject(index, { videoUrl: e.target.value })} />
                      </Field>
                    </div>

                    <Field label="Cover Image">
                      <ImageUpload value={project.image} onChange={(url) => updateProject(index, { image: url })} folder="abo-enterprise/projects" />
                    </Field>

                    <Field label="Gallery Images (one URL per line)">
                      <textarea
                        className="input text-sm min-h-[80px]"
                        value={project.images.join("\n")}
                        onChange={(e) => updateProject(index, { images: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                        placeholder="https://...&#10;https://..."
                      />
                    </Field>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <Field label="Category EN">
                        <input className="input text-sm" value={project.category.en} onChange={(e) => updateProject(index, { category: { ...project.category, en: e.target.value } })} />
                      </Field>
                      <Field label="Category BN">
                        <input className="input text-sm" value={project.category.bn} onChange={(e) => updateProject(index, { category: { ...project.category, bn: e.target.value } })} />
                      </Field>
                      <Field label="Technologies (comma separated)">
                        <input
                          className="input text-sm"
                          value={project.technologies.join(", ")}
                          onChange={(e) => updateProject(index, { technologies: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                        />
                      </Field>
                      <Field label="Sort Order">
                        <input type="number" className="input text-sm" value={project.sortOrder ?? 0} onChange={(e) => updateProject(index, { sortOrder: Number(e.target.value) })} />
                      </Field>
                    </div>

                    {project.liveUrl && (
                      <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-600">
                        <ExternalLink className="w-3 h-3" /> Preview live link
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{services.length} service card(s) — shown on /services/software</p>
            <button type="button" onClick={() => setServices((s) => [...s, emptyService()])} className="admin-btn-secondary !py-1.5 text-sm">
              <Plus className="w-4 h-4" /> Add Service
            </button>
          </div>

          {services.map((service, index) => (
            <div key={service.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm">{service.title.en || "New Service"}</p>
                <button type="button" onClick={() => setServices((s) => s.filter((_, i) => i !== index))} className="text-red-500 p-1.5 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Title EN">
                  <input className="input text-sm" value={service.title.en} onChange={(e) => updateService(index, { title: { ...service.title, en: e.target.value } })} />
                </Field>
                <Field label="Title BN">
                  <input className="input text-sm" value={service.title.bn} onChange={(e) => updateService(index, { title: { ...service.title, bn: e.target.value } })} />
                </Field>
                <Field label="Icon">
                  <select className="input text-sm" value={service.icon} onChange={(e) => updateService(index, { icon: e.target.value })}>
                    {["globe", "bot", "cog", "database", "monitor", "code"].map((ic) => (
                      <option key={ic} value={ic}>{ic}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Gradient Color Class">
                  <input className="input text-sm" value={service.color} onChange={(e) => updateService(index, { color: e.target.value })} placeholder="from-green-500 to-teal-500" />
                </Field>
              </div>

              <Field label="Service Image">
                <ImageUpload value={service.image ?? ""} onChange={(url) => updateService(index, { image: url })} folder="abo-enterprise/services" />
              </Field>

              <Field label="Bullet Items (EN | BN per line)">
                <textarea
                  className="input text-sm min-h-[80px]"
                  value={service.items.map((i) => `${i.en} | ${i.bn}`).join("\n")}
                  onChange={(e) =>
                    updateService(index, {
                      items: e.target.value
                        .split("\n")
                        .map((line) => {
                          const [en, bn] = line.split("|").map((s) => s.trim());
                          return { en: en ?? "", bn: bn ?? en ?? "" };
                        })
                        .filter((i) => i.en),
                    })
                  }
                  placeholder="Business websites | ব্যবসায়িক ওয়েবসাইট"
                />
              </Field>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}
