"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Save,
  Loader2,
  Check,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ImageUpload from "@/components/admin/ImageUpload";
import {
  adminApi,
  adminBlogApi,
  productsApi,
  servicesAdminApi,
} from "@/lib/api";
import api from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import {
  BRAND_IMAGE_SLOTS,
  PAGE_BANNER_SLOTS,
  JSON_IMAGE_SETTINGS,
  CATALOG_IMAGE_SECTIONS,
  MEDIA_UPLOAD_FOLDER,
  type ImageSlotDef,
} from "@/lib/imageRegistry";
import {
  SHOWCASE_PROJECTS_KEY,
  SOFTWARE_SERVICE_CARDS_KEY,
  type ShowcaseProject,
  type SoftwareServiceCard,
} from "@/lib/showcaseContent";
import type { CmsClientLogo, CmsTeamMember } from "@/lib/cmsContent";
import { DEMO_REVIEWS_KEY } from "@/lib/cmsContent";
import type { Product, Service, BlogPost, Review } from "@/types";

type TabId = "brand" | "banners" | "cms" | "showcase" | "catalog";
type SettingValues = Record<string, string>;

const TABS: { id: TabId; label: string; labelBn: string }[] = [
  { id: "brand", label: "Brand & Site", labelBn: "ব্র্যান্ড" },
  { id: "banners", label: "Page Banners", labelBn: "পেজ ব্যানার" },
  { id: "cms", label: "Team & Clients", labelBn: "টিম ও ক্লায়েন্ট" },
  { id: "showcase", label: "Projects", labelBn: "প্রজেক্ট" },
  { id: "catalog", label: "Catalog", labelBn: "ক্যাটালগ" },
];

function parseJson<T>(raw: string, fallback: T): T {
  if (!raw?.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function SlotEditor({
  slot,
  value,
  onChange,
}: {
  slot: ImageSlotDef;
  value: string;
  onChange: (url: string) => void;
}) {
  return (
    <div className="px-4 sm:px-6 py-4 border-b border-gray-50 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-sm font-medium text-gray-800">{slot.label}</p>
          <p className="text-xs text-gray-400">{slot.labelBn}{slot.usedOn ? ` · ${slot.usedOn}` : ""}</p>
        </div>
      </div>
      <ImageUpload
        value={value}
        onChange={onChange}
        folder={MEDIA_UPLOAD_FOLDER}
        hint={slot.hint}
        previewSize="lg"
      />
    </div>
  );
}

export default function AdminMediaPage() {
  const toast = useToastStore((s) => s.push);
  const [tab, setTab] = useState<TabId>("brand");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [values, setValues] = useState<SettingValues>({});

  const [team, setTeam] = useState<CmsTeamMember[]>([]);
  const [clients, setClients] = useState<CmsClientLogo[]>([]);
  const [projects, setProjects] = useState<ShowcaseProject[]>([]);
  const [serviceCards, setServiceCards] = useState<SoftwareServiceCard[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [reviews, setReviews] = useState<{ id: string; customer_name: string; photo_url: string | null }[]>([]);
  const [demoReviews, setDemoReviews] = useState<Review[]>([]);
  const [catalogOpen, setCatalogOpen] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, productsRes, servicesRes, blogRes, reviewsRes] = await Promise.all([
        adminApi.getSettings(),
        productsApi.adminList({ page: 1, per_page: 100 }),
        servicesAdminApi.list({ page: 1, per_page: 100 }),
        adminBlogApi.list({ page: 1, per_page: 100 }),
        api.get("/api/v1/reviews/admin", { params: { page: 1, per_page: 100 } }),
      ]);
      const s = settingsRes.data.data ?? {};
      setValues(s);
      setTeam(parseJson<CmsTeamMember[]>(s[JSON_IMAGE_SETTINGS.team.key] ?? "", []));
      setClients(parseJson<CmsClientLogo[]>(s[JSON_IMAGE_SETTINGS.clients.key] ?? "", []));
      setProjects(parseJson<ShowcaseProject[]>(s[SHOWCASE_PROJECTS_KEY] ?? "", []));
      setServiceCards(parseJson<SoftwareServiceCard[]>(s[SOFTWARE_SERVICE_CARDS_KEY] ?? "", []));
      setProducts(productsRes.data.data ?? []);
      setServices(servicesRes.data.data ?? []);
      setPosts(blogRes.data.data ?? []);
      setReviews((reviewsRes.data.data ?? []) as typeof reviews);
      setDemoReviews(parseJson<Review[]>(s[DEMO_REVIEWS_KEY] ?? "", []));
    } catch (e) {
      toast("error", apiErrorMessage(e, "Failed to load media"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = async (sectionId: string, items: { key: string; value: string; data_type?: string }[]) => {
    setSaving(sectionId);
    setSaved(null);
    try {
      await adminApi.upsertSettings(items);
      setSaved(sectionId);
      toast("success", "Images saved");
      setTimeout(() => setSaved(null), 2000);
    } catch (e) {
      toast("error", apiErrorMessage(e, "Save failed"));
    } finally {
      setSaving(null);
    }
  };

  const saveBrand = () =>
    saveSettings(
      "brand",
      BRAND_IMAGE_SLOTS.map((slot) => ({
        key: slot.key,
        value: values[slot.key] ?? "",
        data_type: "string",
      }))
    );

  const saveBanners = () =>
    saveSettings(
      "banners",
      PAGE_BANNER_SLOTS.map((slot) => ({
        key: slot.key,
        value: values[slot.key] ?? "",
        data_type: "string",
      }))
    );

  const saveJson = (sectionId: string, key: string, data: unknown) =>
    saveSettings(sectionId, [{ key, value: JSON.stringify(data), data_type: "json" }]);

  const filteredBanners = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PAGE_BANNER_SLOTS;
    return PAGE_BANNER_SLOTS.filter(
      (s) => s.label.toLowerCase().includes(q) || s.labelBn.includes(q) || s.usedOn?.toLowerCase().includes(q)
    );
  }, [search]);

  const patchProduct = async (id: string, data: Partial<Product>) => {
    try {
      await productsApi.update(id, data);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
      toast("success", "Product image updated");
    } catch (e) {
      toast("error", apiErrorMessage(e, "Update failed"));
    }
  };

  const patchService = async (id: string, data: Partial<Service>) => {
    try {
      await servicesAdminApi.update(id, data);
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
      toast("success", "Service image updated");
    } catch (e) {
      toast("error", apiErrorMessage(e, "Update failed"));
    }
  };

  const patchBlog = async (id: string, data: Partial<BlogPost>) => {
    try {
      await adminBlogApi.update(id, data);
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
      toast("success", "Blog image updated");
    } catch (e) {
      toast("error", apiErrorMessage(e, "Update failed"));
    }
  };

  const patchProductImage = (id: string, image_url: string) => patchProduct(id, { image_url });

  const patchServiceImage = (id: string, featured_image_url: string) =>
    patchService(id, { featured_image_url });

  const patchBlogImage = (id: string, featured_image_url: string) =>
    patchBlog(id, { featured_image_url });

  const patchReviewPhoto = async (id: string, photo_url: string) => {
    try {
      await api.patch(`/api/v1/reviews/${id}`, { photo_url: photo_url || null });
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, photo_url: photo_url || null } : r)));
      toast("success", "Review photo updated");
    } catch (e) {
      toast("error", apiErrorMessage(e, "Update failed"));
    }
  };

  const SectionHeader = ({
    title,
    titleBn,
    sectionId,
    onSave,
    extra,
  }: {
    title: string;
    titleBn: string;
    sectionId: string;
    onSave: () => void;
    extra?: React.ReactNode;
  }) => {
    const isSaving = saving === sectionId;
    const isSaved = saved === sectionId;
    return (
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50 gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          <p className="text-xs text-gray-400">{titleBn}</p>
        </div>
        <div className="flex items-center gap-2">
          {extra}
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              isSaved ? "bg-green-500 text-white" : "bg-brand-600 text-white hover:bg-brand-700"
            } disabled:opacity-60`}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {isSaving ? "Saving…" : isSaved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Image Manager"
        titleBn="ছবি ব্যবস্থাপনা"
        description="Upload, update, or remove all website images from one place — brand, banners, team, projects, products, services, blog & reviews."
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t.id ? "bg-brand-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-brand-300"
            }`}
          >
            {t.label}
            <span className="hidden sm:inline text-white/70 ml-1">/ {t.labelBn}</span>
          </button>
        ))}
      </div>

      {tab === "brand" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader title="Brand & Site Images" titleBn="ব্র্যান্ড ও সাইট ছবি" sectionId="brand" onSave={saveBrand} />
          {BRAND_IMAGE_SLOTS.map((slot) => (
            <SlotEditor
              key={slot.key}
              slot={slot}
              value={values[slot.key] ?? ""}
              onChange={(url) => setValues((v) => ({ ...v, [slot.key]: url }))}
            />
          ))}
        </div>
      )}

      {tab === "banners" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            title="Page Banner Images"
            titleBn="পেজ ব্যানার ছবি (২৫টি)"
            sectionId="banners"
            onSave={saveBanners}
            extra={
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search page…"
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg w-40 sm:w-52"
                />
              </div>
            }
          />
          {filteredBanners.map((slot) => (
            <SlotEditor
              key={slot.key}
              slot={slot}
              value={values[slot.key] ?? ""}
              onChange={(url) => setValues((v) => ({ ...v, [slot.key]: url }))}
            />
          ))}
        </div>
      )}

      {tab === "cms" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <SectionHeader
              title="About Team Photos"
              titleBn="টিম সদস্যের ছবি"
              sectionId="team"
              onSave={() => saveJson("team", JSON_IMAGE_SETTINGS.team.key, team)}
            />
            {team.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-400">No team members in CMS. Edit in Settings → About Team JSON.</p>
            ) : (
              team.map((member, i) => (
                <div key={member.id} className="px-4 sm:px-6 py-4 border-b border-gray-50">
                  <p className="text-sm font-medium text-gray-800 mb-2">{member.name}</p>
                  <ImageUpload
                    value={member.image ?? ""}
                    onChange={(url) => setTeam((prev) => prev.map((m, idx) => (idx === i ? { ...m, image: url } : m)))}
                    folder={MEDIA_UPLOAD_FOLDER}
                    previewSize="lg"
                  />
                </div>
              ))
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <SectionHeader
              title="Client Logos"
              titleBn="ক্লায়েন্ট লোগো"
              sectionId="clients"
              onSave={() => saveJson("clients", JSON_IMAGE_SETTINGS.clients.key, clients)}
            />
            {clients.map((client, i) => (
              <div key={`${client.name}-${i}`} className="px-4 sm:px-6 py-4 border-b border-gray-50">
                <p className="text-sm font-medium text-gray-800 mb-2">{client.name} ({client.abbr})</p>
                <ImageUpload
                  value={client.image ?? ""}
                  onChange={(url) => setClients((prev) => prev.map((c, idx) => (idx === i ? { ...c, image: url } : c)))}
                  folder={MEDIA_UPLOAD_FOLDER}
                  previewSize="md"
                />
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <SectionHeader
              title="Demo Review Avatars (Offline)"
              titleBn="ডেমো রিভিউ ছবি"
              sectionId="demoReviews"
              onSave={() => saveJson("demoReviews", DEMO_REVIEWS_KEY, demoReviews)}
            />
            {demoReviews.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-400">No demo reviews in CMS.</p>
            ) : (
              demoReviews.map((r, i) => (
                <div key={r.id ?? `demo-${i}`} className="px-4 sm:px-6 py-4 border-b border-gray-50">
                  <p className="text-sm font-medium text-gray-800 mb-2">{r.customer_name}</p>
                  <ImageUpload
                    value={r.photo_url ?? ""}
                    onChange={(url) =>
                      setDemoReviews((prev) => prev.map((item, idx) => (idx === i ? { ...item, photo_url: url } : item)))
                    }
                    folder={MEDIA_UPLOAD_FOLDER}
                    previewSize="sm"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "showcase" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <SectionHeader
              title="Project Gallery Images"
              titleBn="প্রজেক্ট গ্যালারি"
              sectionId="projects"
              onSave={() => saveJson("projects", SHOWCASE_PROJECTS_KEY, projects)}
              extra={
                <Link href="/admin/showcase" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                  Full editor <ExternalLink className="w-3 h-3" />
                </Link>
              }
            />
            {projects.map((project, pi) => (
              <div key={project.id} className="px-4 sm:px-6 py-4 border-b border-gray-50">
                <p className="text-sm font-semibold text-gray-800 mb-3">{project.title.en || project.slug}</p>
                <p className="text-xs text-gray-400 mb-2">Cover image</p>
                <ImageUpload
                  value={project.image}
                  onChange={(url) => setProjects((prev) => prev.map((p, i) => (i === pi ? { ...p, image: url } : p)))}
                  folder="abo-enterprise/projects"
                  previewSize="lg"
                />
                {(project.images ?? []).map((img, gi) => (
                  <div key={gi} className="mt-3 pl-3 border-l-2 border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-400">Gallery #{gi + 1}</p>
                      <button
                        type="button"
                        onClick={() =>
                          setProjects((prev) =>
                            prev.map((p, i) =>
                              i === pi ? { ...p, images: p.images.filter((_, idx) => idx !== gi) } : p
                            )
                          )
                        }
                        className="text-xs text-red-500 flex items-center gap-0.5"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                    <ImageUpload
                      value={img}
                      onChange={(url) =>
                        setProjects((prev) =>
                          prev.map((p, i) =>
                            i === pi ? { ...p, images: p.images.map((u, idx) => (idx === gi ? url : u)) } : p
                          )
                        )
                      }
                      folder="abo-enterprise/projects"
                      previewSize="md"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setProjects((prev) =>
                      prev.map((p, i) => (i === pi ? { ...p, images: [...(p.images ?? []), ""] } : p))
                    )
                  }
                  className="mt-2 text-xs text-brand-600 hover:underline"
                >
                  + Add gallery image
                </button>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <SectionHeader
              title="Software Service Card Images"
              titleBn="সফটওয়্যার সেবা কার্ড"
              sectionId="serviceCards"
              onSave={() => saveJson("serviceCards", SOFTWARE_SERVICE_CARDS_KEY, serviceCards)}
            />
            {serviceCards.map((card, i) => (
              <div key={card.id} className="px-4 sm:px-6 py-4 border-b border-gray-50">
                <p className="text-sm font-medium text-gray-800 mb-2">{card.title.en}</p>
                <ImageUpload
                  value={card.image ?? ""}
                  onChange={(url) => setServiceCards((prev) => prev.map((c, idx) => (idx === i ? { ...c, image: url } : c)))}
                  folder="abo-enterprise/services"
                  previewSize="lg"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "catalog" && (
        <div className="space-y-4">
          {CATALOG_IMAGE_SECTIONS.map((section) => {
            const open = catalogOpen[section.id] ?? true;
            const count =
              section.id === "products"
                ? products.length
                : section.id === "services"
                  ? services.length
                  : section.id === "blog"
                    ? posts.length
                    : reviews.length;

            return (
              <div key={section.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCatalogOpen((o) => ({ ...o, [section.id]: !open }))}
                  className="w-full flex items-center justify-between px-4 sm:px-6 py-4 bg-gray-50/50 hover:bg-gray-50"
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800">{section.label} ({count})</p>
                    <p className="text-xs text-gray-400">{section.labelBn}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={section.adminHref}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                    >
                      Full editor <ExternalLink className="w-3 h-3" />
                    </Link>
                    {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {open && (
                  <div className="divide-y divide-gray-50">
                    {section.id === "products" &&
                      products.map((p) =>
                        p.id ? (
                          <div key={p.id} className="px-4 sm:px-6 py-4 space-y-3">
                            <p className="text-sm font-medium text-gray-800">{p.name_en}</p>
                            <p className="text-xs text-gray-400">Main image</p>
                            <ImageUpload
                              value={p.image_url ?? ""}
                              onChange={(url) => patchProductImage(p.id!, url)}
                              folder={MEDIA_UPLOAD_FOLDER}
                              previewSize="md"
                            />
                            <p className="text-xs text-gray-400">Gallery images</p>
                            {(p.images ?? []).map((img, gi) => (
                              <ImageUpload
                                key={gi}
                                value={img}
                                onChange={(url) => {
                                  const next = [...(p.images ?? [])];
                                  next[gi] = url;
                                  patchProduct(p.id!, { images: next.filter(Boolean) });
                                }}
                                folder={MEDIA_UPLOAD_FOLDER}
                                previewSize="sm"
                              />
                            ))}
                            <button
                              type="button"
                              onClick={() => patchProduct(p.id!, { images: [...(p.images ?? []), ""] })}
                              className="text-xs text-brand-600 hover:underline"
                            >
                              + Add gallery image
                            </button>
                            <p className="text-xs text-gray-400">Social share (OG)</p>
                            <ImageUpload
                              value={p.og_image ?? ""}
                              onChange={(url) => patchProduct(p.id!, { og_image: url })}
                              folder={MEDIA_UPLOAD_FOLDER}
                              previewSize="sm"
                            />
                          </div>
                        ) : null
                      )}

                    {section.id === "services" &&
                      services.map((s) =>
                        s.id ? (
                          <div key={s.id} className="px-4 sm:px-6 py-4 space-y-3">
                            <p className="text-sm font-medium text-gray-800">{s.name_en}</p>
                            <p className="text-xs text-gray-400">Featured image</p>
                            <ImageUpload
                              value={s.featured_image_url ?? ""}
                              onChange={(url) => patchServiceImage(s.id!, url)}
                              folder={MEDIA_UPLOAD_FOLDER}
                              previewSize="md"
                            />
                            <p className="text-xs text-gray-400">Icon image</p>
                            <ImageUpload
                              value={s.icon_url ?? ""}
                              onChange={(url) => patchService(s.id!, { icon_url: url })}
                              folder={MEDIA_UPLOAD_FOLDER}
                              previewSize="sm"
                            />
                            <p className="text-xs text-gray-400">Social share (OG)</p>
                            <ImageUpload
                              value={s.og_image ?? ""}
                              onChange={(url) => patchService(s.id!, { og_image: url })}
                              folder={MEDIA_UPLOAD_FOLDER}
                              previewSize="sm"
                            />
                          </div>
                        ) : null
                      )}

                    {section.id === "blog" &&
                      posts.map((post) =>
                        post.id ? (
                          <div key={post.id} className="px-4 sm:px-6 py-4 space-y-3">
                            <p className="text-sm font-medium text-gray-800">{post.title_en}</p>
                            <p className="text-xs text-gray-400">Featured image</p>
                            <ImageUpload
                              value={post.featured_image_url ?? ""}
                              onChange={(url) => patchBlogImage(post.id!, url)}
                              folder={MEDIA_UPLOAD_FOLDER}
                              previewSize="md"
                            />
                            <p className="text-xs text-gray-400">Social share (OG)</p>
                            <ImageUpload
                              value={post.og_image ?? ""}
                              onChange={(url) => patchBlog(post.id!, { og_image: url })}
                              folder={MEDIA_UPLOAD_FOLDER}
                              previewSize="sm"
                            />
                          </div>
                        ) : null
                      )}

                    {section.id === "reviews" &&
                      reviews.map((r) => (
                        <div key={r.id} className="px-4 sm:px-6 py-4">
                          <p className="text-sm font-medium text-gray-800 mb-2">{r.customer_name}</p>
                          <ImageUpload
                            value={r.photo_url ?? ""}
                            onChange={(url) => patchReviewPhoto(r.id, url)}
                            folder={MEDIA_UPLOAD_FOLDER}
                            previewSize="sm"
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
