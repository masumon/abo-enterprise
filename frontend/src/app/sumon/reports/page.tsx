"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, BarChart3 } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { reportsApi, downloadCsv, type ReportType } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";

const REPORT_TABS: { value: ReportType; label: string; labelBn: string }[] = [
  { value: "sales", label: "Sales", labelBn: "বিক্রয়" },
  { value: "revenue", label: "Revenue", labelBn: "রেভিনিউ" },
  { value: "products", label: "Products", labelBn: "পণ্য" },
  { value: "services", label: "Services", labelBn: "সেবা" },
  { value: "customers", label: "Customers", labelBn: "গ্রাহক" },
  { value: "payments", label: "Payments", labelBn: "পেমেন্ট" },
  { value: "courier", label: "Courier", labelBn: "কুরিয়ার" },
  { value: "profit", label: "Profit", labelBn: "লাভ" },
  { value: "reconciliation", label: "Reconciliation", labelBn: "রিকনসিলিয়েশন" },
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
  const [report, setReport] = useState<ReportType>("sales");
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
      toast("error", apiErrorMessage(err, "Failed to load report"));
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
      toast("error", apiErrorMessage(err, "Export failed"));
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
    <div className="space-y-6 max-w-6xl">
      <AdminPageHeader
        title="Reports"
        titleBn="রিপোর্ট"
        description="Sales, revenue, products, services, customers, payments, courier, profit and reconciliation — filterable by date range, exportable as CSV"
        descriptionBn="বিক্রয়, রেভিনিউ, পণ্য, সেবা, গ্রাহক, পেমেন্ট, কুরিয়ার, লাভ এবং রিকনসিলিয়েশন — তারিখ পরিসর অনুযায়ী ফিল্টার এবং CSV এক্সপোর্ট করা যায়"
        actions={
          <button type="button" onClick={handleExport} disabled={exporting || dataRows.length === 0} className="btn btn-brand btn-sm gap-1.5">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setReport(tab.value)}
            className={`btn btn-sm ${report === tab.value ? "btn-brand" : "btn-outline"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Start date</label>
          <input type="date" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)} className="admin-input text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">End date</label>
          <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className="admin-input text-sm" />
        </div>
      </div>

      {summaryRow && (
        <div className="admin-card p-4 bg-brand-50/40 border-brand-100 text-sm text-brand-800">
          {Object.entries(summaryRow).filter(([k]) => k !== "summary").map(([k, v]) => (
            <p key={k}><span className="font-semibold">{k.replace(/_/g, " ")}:</span> {formatCell(v)}</p>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : dataRows.length === 0 ? (
        <div className="admin-card p-10 text-center text-gray-400">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          No data for this report in the selected date range
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
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
