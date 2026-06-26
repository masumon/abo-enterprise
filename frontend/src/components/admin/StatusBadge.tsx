import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  pending:       { label: "Pending",        class: "bg-amber-100 text-amber-700 border-amber-200" },
  confirmed:     { label: "Confirmed",      class: "bg-blue-100 text-blue-700 border-blue-200" },
  processing:    { label: "Processing",     class: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  shipped:       { label: "Shipped",        class: "bg-purple-100 text-purple-700 border-purple-200" },
  delivered:     { label: "Delivered",      class: "bg-green-100 text-green-700 border-green-200" },
  cancelled:     { label: "Cancelled",      class: "bg-red-100 text-red-700 border-red-200" },
  contacted:     { label: "Contacted",      class: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress:   { label: "In Progress",    class: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  completed:     { label: "Completed",      class: "bg-green-100 text-green-700 border-green-200" },
  new:           { label: "New",            class: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  qualified:     { label: "Qualified",      class: "bg-blue-100 text-blue-700 border-blue-200" },
  proposal_sent: { label: "Proposal Sent",  class: "bg-violet-100 text-violet-700 border-violet-200" },
  won:           { label: "Won",            class: "bg-green-100 text-green-700 border-green-200" },
  lost:          { label: "Lost",           class: "bg-gray-100 text-gray-600 border-gray-200" },
  paid:          { label: "Paid",           class: "bg-green-100 text-green-700 border-green-200" },
  failed:        { label: "Failed",         class: "bg-red-100 text-red-700 border-red-200" },
  active:        { label: "Active",         class: "bg-green-100 text-green-700 border-green-200" },
  inactive:      { label: "Inactive",       class: "bg-gray-100 text-gray-600 border-gray-200" },
  negotiation:   { label: "Negotiation",    class: "bg-amber-100 text-amber-700 border-amber-200" },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] ?? { label: status, class: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", config.class)}>
      {config.label}
    </span>
  );
}
