"use client";

import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function AdminEmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="admin-empty-state">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-gray-300" />
      </div>
      <p className="text-gray-600 font-semibold">{title}</p>
      {description && <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
