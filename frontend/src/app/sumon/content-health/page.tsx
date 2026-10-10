"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, ChevronDown, Wrench } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { adminApi, productsApi, servicesAdminApi, adminBlogApi, categoriesAdminApi, promoSlidesApi } from "@/lib/api";
import type { PaginatedResponse } from "@/types";
import { buildContentHealth, type HealthGroup } from "@/lib/contentHealth";
import { toBnDigits } from "@/lib/flashSale";

/** Fetch every page of an admin list (100 per page, capped for safety). */
async function fetchAll<T>(get: (page: number) => Promise<{ data: PaginatedResponse<T> }>): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= 30; page++) {
    const r = await get(page);
    const rows = r.data.data ?? [];
    out.push(...rows);
    const totalPages = r.data.meta?.total_pages ?? 1;
    if (rows.length === 0 || page >= totalPages) break;
  }
  return out;
}

const SHOW = 8;

/** "কনটেন্ট স্বাস্থ্য" — read-only list of what needs attention, each with a
 * "ঠিক করুন" link to the exact edit place. Uses existing admin APIs only. */
export default function ContentHealthPage() {
  const [groups, setGroups] = useState<HealthGroup[] | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const miss: string[] = [];
    const safe = <T,>(p: Promise<T>, name: string, fb: T) => p.catch(() => { miss.push(name); return fb; });
    const [settings, products, services, posts, categories, slides] = await Promise.all([
      safe(adminApi.getSettings().then((r) => (r.data.data ?? {}) as Record<string, string>), "সেটিংস", {} as Record<string, string>),
      safe(fetchAll((page) => productsApi.adminList({ page, per_page: 100 })), "পণ্য", []),
      safe(fetchAll((page) => servicesAdminApi.list({ page, per_page: 100 })), "সেবা", []),
      safe(fetchAll((page) => adminBlogApi.list({ page, per_page: 100 })), "ব্লগ", []),
      safe(categoriesAdminApi.list().then((r) => r.data.data ?? []), "ক্যাটাগরি", []),
      safe(promoSlidesApi.adminList().then((r) => r.data.data ?? []), "স্লাইড", []),
    ]);
    setGroups(buildContentHealth({ settings, products, services, posts, categories, slides }));
    setFailed(miss);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
  useEffect(() => { void load(); }, [load]);

  const total = (groups ?? []).reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="admin-page admin-page-narrow">
      <AdminPageHeader
        title="Content Health"
        titleBn="কনটেন্ট স্বাস্থ্য"
        description="Everything on the website that needs attention, with a link to fix it."
        descriptionBn="ওয়েবসাইটে যা ঠিক করা দরকার — এক তালিকায়। প্রতিটির পাশে 'ঠিক করুন' চাপলে সরাসরি সেই জায়গায় যাবেন।"
        className="mb-4"
        actions={
          <button type="button" onClick={() => void load()} disabled={loading} className="btn btn-outline btn-sm gap-1.5 disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} আবার দেখুন
          </button>
        }
      />

      {loading && !groups ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-4">
          {failed.length > 0 && (
            <p className="rounded-xl border border-amber-200 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300">
              এগুলো লোড করা যায়নি, তাই পরীক্ষা বাদ পড়েছে: {failed.join(", ")}। একটু পরে &quot;আবার দেখুন&quot; চাপুন।
            </p>
          )}
          <div className="enterprise-card p-4 flex items-center gap-3">
            {total === 0 ? <CheckCircle2 className="w-8 h-8 text-green-600 flex-none" /> : <AlertTriangle className="w-8 h-8 text-amber-500 flex-none" />}
            <div>
              <p className="text-sm font-bold text-heading">{total === 0 ? "সব ঠিক আছে!" : `${toBnDigits(total)}টি জিনিস ঠিক করা দরকার`}</p>
              <p className="text-xs text-muted">শুধু দেখার পাতা — এখানে কিছু বদলায় না। লুকানো (বন্ধ) পণ্য/সেবা বাদ দেওয়া হয়েছে।</p>
            </div>
          </div>

          {(groups ?? []).map((g) => {
            const isOpen = open[g.id] ?? false;
            const list = isOpen ? g.items : g.items.slice(0, SHOW);
            return (
              <section key={g.id} className="enterprise-card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-heading">{g.titleBn} <span className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300">{toBnDigits(g.items.length)}</span></h2>
                    <p className="text-xs text-muted mt-0.5">{g.helpBn}</p>
                  </div>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-white/10">
                  {list.map((it) => (
                    <li key={it.key} className="flex items-center gap-3 py-2">
                      <span className="flex-1 min-w-0 text-sm text-heading truncate">
                        {it.label}
                        {it.note && <span className="ml-2 text-[11px] text-muted">({it.note})</span>}
                      </span>
                      <Link href={it.href} className="btn btn-outline btn-sm gap-1 flex-none">
                        <Wrench className="w-3.5 h-3.5" /> ঠিক করুন
                      </Link>
                    </li>
                  ))}
                </ul>
                {g.items.length > SHOW && (
                  <button type="button" onClick={() => setOpen((o) => ({ ...o, [g.id]: !isOpen }))} className="mt-2 text-xs font-semibold text-brand-600 dark:text-brand-300 inline-flex items-center gap-1">
                    {isOpen ? "কম দেখান" : `সব দেখুন (${toBnDigits(g.items.length)})`}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
