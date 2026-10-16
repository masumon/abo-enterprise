"use client";

import { cn } from "@/lib/utils";
import { useAdminT } from "@/lib/i18n/adminText";

const STATUS_MAP: Record<string, { label: string; class: string; darkClass: string }> = {
  pending: { label: "Pending", class: "bg-amber-100 text-amber-700 border-amber-200", darkClass: "admin-shell-status-pending" },
  confirmed: { label: "Confirmed", class: "bg-blue-100 text-blue-700 border-blue-200", darkClass: "admin-shell-status-confirmed" },
  processing: { label: "Processing", class: "bg-indigo-100 text-indigo-700 border-indigo-200", darkClass: "admin-shell-status-processing" },
  shipped: { label: "Shipped", class: "bg-purple-100 text-purple-700 border-purple-200", darkClass: "admin-shell-status-shipped" },
  delivered: { label: "Delivered", class: "bg-green-100 text-green-700 border-green-200", darkClass: "admin-shell-status-completed" },
  cancelled: { label: "Cancelled", class: "bg-red-100 text-red-700 border-red-200", darkClass: "admin-shell-status-cancelled" },
  returned: { label: "Returned", class: "bg-orange-100 text-orange-700 border-orange-200", darkClass: "admin-shell-status-returned" },
  refunded: { label: "Refunded", class: "bg-orange-100 text-orange-700 border-orange-200", darkClass: "admin-shell-status-returned" },
  partially_refunded: { label: "Part refunded", class: "bg-orange-50 text-orange-700 border-orange-200", darkClass: "admin-shell-status-returned" },
  contacted: { label: "Contacted", class: "bg-blue-100 text-blue-700 border-blue-200", darkClass: "admin-shell-status-confirmed" },
  in_progress: { label: "In Progress", class: "bg-indigo-100 text-indigo-700 border-indigo-200", darkClass: "admin-shell-status-processing" },
  completed: { label: "Completed", class: "bg-green-100 text-green-700 border-green-200", darkClass: "admin-shell-status-completed" },
  new: { label: "New", class: "bg-emerald-100 text-emerald-700 border-emerald-200", darkClass: "admin-shell-status-new" },
  qualified: { label: "Qualified", class: "bg-blue-100 text-blue-700 border-blue-200", darkClass: "admin-shell-status-confirmed" },
  proposal_sent: { label: "Proposal Sent", class: "bg-violet-100 text-violet-700 border-violet-200", darkClass: "admin-shell-status-confirmed" },
  won: { label: "Won", class: "bg-green-100 text-green-700 border-green-200", darkClass: "admin-shell-status-completed" },
  lost: { label: "Lost", class: "bg-gray-100 text-gray-600 border-gray-200", darkClass: "admin-shell-status-lost" },
  paid: { label: "Paid", class: "bg-green-100 text-green-700 border-green-200", darkClass: "admin-shell-status-paid" },
  failed: { label: "Failed", class: "bg-red-100 text-red-700 border-red-200", darkClass: "admin-shell-status-cancelled" },
  active: { label: "Active", class: "bg-green-100 text-green-700 border-green-200", darkClass: "admin-shell-status-active" },
  inactive: { label: "Inactive", class: "bg-gray-100 text-gray-600 border-gray-200", darkClass: "admin-shell-status-lost" },
  negotiation: { label: "Negotiation", class: "bg-amber-100 text-amber-700 border-amber-200", darkClass: "admin-shell-status-pending" },
};

export default function StatusBadge({ status }: { status: string }) {
  const tx = useAdminT();
  const config = STATUS_MAP[status] ?? { label: status, class: "bg-gray-100 text-gray-600 border-gray-200", darkClass: "admin-shell-status-lost" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm", config.class, config.darkClass)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {tx(config.label)}
    </span>
  );
}
