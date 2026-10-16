"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Loader2, BarChart3 } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { reportsApi, downloadCsv, type ReportType } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";

const REPORT_TABS: { value: ReportType; label: string; labelBn: string }[] = [
  { value: "sales", label: "বিক্রি", labelBn: "বিক্রয়" },
  { value: "revenue", label: "আয়", labelBn: "রেভিনিউ" },
  { value: "products", label: "পণ্য", labelBn: "পণ্য" },
  { value: "services", label: "সেবা", labelBn: "সেবা" },
  { value: "customers", label: "গ্রাহক", labelBn: "গ্রাহক" },
  { value: "payments", label: "পেমেন্ট", labelBn: "পেমেন্ট" },
  { value: "courier", label: "কুরিয়ার", labelBn: "কুরিয়ার" },
  { value: "profit", label: "লাভ", labelBn: "লাভ" },
  { value: "reconciliation", label: "হিসাব মিলানো", labelBn: "রিকনসিলিয়েশন" },
];

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export default function AdminReportsPage() {
  const toast = useToastStore((s) => s.push);
  const searchParams = useSearchParams();
  const [report, setReport] = useState<ReportType>(() => {
    const requested = searchParams.get("report");
    return REPORT_TABS.some((t) => t.value === requested) ? (requested as ReportType) : "sales";
  });
  const [startDate, setStartDate] = useState(() => toDateInput(new Date(Date.now() - 30 * 86400000)));
  const [endDate, setEndDate] = useState(() => toDateInput(new Date()));
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await reportsApi.get(report, { start_date: startDate, end_date: endDate });
      setRows(r.data.data?.rows ?? []);
    } catch (err) {
      setRows([]);
      toast("error", apiErrorMessage(err, "রিপোর্ট আনা যায়নি"));
    } finally {
      setLoading(false);
    }
  }, [report, startDate, endDate, toast]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadCsv(reportsApi.exportPath(report, { start_date: startDate, end_date: endDate }), `${report}_${startDate}_${endDate}.csv`);
    } catch (err) {
      toast("error", apiErrorMessage(err, "ডাউনলোড করা যায়নি"));
    } finally {
      setExporting(false);
    }
  };

  // Columns are derived from the union of keys across rows since each report
  // type has a different shape — summary/disclosure rows (e.g. profit's
  // "products missing cost price" note) are rendered as a callout instead.
  const dataRows = rows.filter((r) => !r.summary);
  const summaryRow = rows.find((r) => r.summary);
  const columns = Array.from(new Set(dataRows.flatMap((r) => Object.keys(r))));

  return (
    <div className="admin-page space-y-5">
      <AdminPageHeader
        title="Reports"
        titleBn="রিপোর্ট"
        description="Sales, revenue, products, services, customers, payments, courier, profit and reconciliation — filterable by date range, exportable as CSV. This is the canonical place to check exact numbers."
        descriptionBn="বিক্রয়, রেভিনিউ, পণ্য, সেবা, গ্রাহক, পেমেন্ট, কুরিয়ার, লাভ এবং রিকনসিলিয়েশন — তারিখ পরিসর অনুযায়ী ফিল্টার এবং CSV এক্সপোর্ট করা যায়। সঠিক সংখ্যা যাচাইয়ের জন্য এটিই মূল জায়গা।"
        actions={
          <button type="button" onClick={handleExport} disabled={exporting || dataRows.length === 0} className="btn btn-brand btn-sm min-h-11 gap-1.5 px-4">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
        }
      />

      <section aria-label="রিপোর্ট বাছুন" className="min-w-0">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-heading">রিপোর্টের ধরন</h2>
          <span className="text-xs text-gray-500">{REPORT_TABS.length} reports</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 min-[641px]:flex-wrap min-[641px]:overflow-visible min-[641px]:pb-0" role="group" aria-label="রিপোর্টের ধরন">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setReport(tab.value)}
              aria-pressed={report === tab.value}
              className={`btn btn-sm min-h-11 shrink-0 px-4 transition-colors ${report === tab.value ? "btn-brand shadow-sm" : "btn-outline"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <section className="admin-card rounded-2xl border border-gray-100 p-4 shadow-sm" aria-label="রিপোর্টের সময়সীমা">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-heading">রিপোর্টের সময়</h2>
            <p className="text-xs text-gray-500">রিপোর্ট দেখতে তারিখ বাছুন</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 min-[641px]:flex min-[641px]:items-end">
          <div className="min-w-0">
            <label htmlFor="report-start-date" className="mb-1.5 block text-xs font-medium text-gray-600">শুরুর তারিখ</label>
            <input id="report-start-date" type="date" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)} className="admin-input min-h-11 w-full text-sm min-[641px]:w-auto" />
          </div>
          <div className="min-w-0">
            <label htmlFor="report-end-date" className="mb-1.5 block text-xs font-medium text-gray-600">শেষ তারিখ</label>
            <input id="report-end-date" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className="admin-input min-h-11 w-full text-sm min-[641px]:w-auto" />
          </div>
        </div>
      </section>

      {summaryRow && (
        <section className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4 text-sm text-brand-900" aria-label="রিপোর্টের সারাংশ">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <BarChart3 className="h-4 w-4 shrink-0" aria-hidden="true" />
            রিপোর্টের নোট
          </div>
          <div className="space-y-2">
            {Object.entries(summaryRow).filter(([k]) => k !== "summary").map(([k, v]) => (
              <p key={k} className="break-words">
                <span className="font-semibold capitalize">{k.replace(/_/g, " ")}:</span>{" "}
                <span>{formatCell(v)}</span>
              </p>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : dataRows.length === 0 ? (
        <div className="admin-card rounded-2xl border border-dashed border-gray-200 p-8 text-center sm:p-10">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
            <BarChart3 className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="text-sm font-semibold text-gray-700">এই সময়ে কোনো তথ্য নেই</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">There are no records for this report in the selected date range. Try adjusting the dates.</p>
        </div>
      ) : (
        <div className="admin-card overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
          <div className="space-y-3 p-3 min-[641px]:hidden">
            {dataRows.map((row, i) => {
              const entries = columns.map((column) => [column, row[column]] as const);
              const [lead, ...details] = entries;
              return (
                <article key={i} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  {lead && (
                    <div className="border-b border-gray-100 bg-gradient-to-r from-brand-50/80 to-white px-4 py-3">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">{lead[0].replace(/_/g, " ")}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-500 ring-1 ring-gray-200">#{String(i + 1).padStart(2, "0")}</span>
                      </div>
                      <p className="break-words text-base font-semibold leading-snug text-gray-900">{formatCell(lead[1])}</p>
                    </div>
                  )}
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-3 p-4 min-[420px]:grid-cols-2">
                    {details.map(([column, value]) => (
                      <div key={column} className="min-w-0">
                        <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{column.replace(/_/g, " ")}</dt>
                        <dd className="break-words text-sm leading-5 text-gray-800">{formatCell(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              );
            })}
          </div>
          <div className="hidden min-[641px]:block overflow-x-auto">
            <table className="table-premium min-w-[600px]">
              <thead>
                <tr>
                  {columns.map((c) => <th key={c}>{c.replace(/_/g, " ")}</th>)}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, i) => (
                  <tr key={i}>
                    {columns.map((c) => <td key={c} className="text-sm text-gray-700">{formatCell(row[c])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
