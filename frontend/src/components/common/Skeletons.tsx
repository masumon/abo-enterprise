import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return <div className={cn("bg-gray-200 animate-pulse rounded-lg", className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <Bone className="h-48 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Bone className="h-4 w-3/4" />
        <Bone className="h-4 w-1/2" />
        <div className="flex justify-between">
          <Bone className="h-6 w-20" />
          <Bone className="h-8 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function ServiceCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Bone className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Bone className="h-4 w-2/3" />
          <Bone className="h-3 w-1/2" />
        </div>
      </div>
      <Bone className="h-3 w-full" />
      <Bone className="h-3 w-5/6" />
      <Bone className="h-9 w-full rounded-xl" />
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <Bone className="w-10 h-10 rounded-xl" />
          <Bone className="h-7 w-20" />
          <Bone className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Bone className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2 mb-6">
      <Bone className="h-8 w-48" />
      <Bone className="h-4 w-72" />
    </div>
  );
}
