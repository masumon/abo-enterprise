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
      <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-brand-50 to-white border border-brand-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
        <Icon className="w-7 h-7 text-brand-300" />
      </div>
      <p className="text-gray-700 font-semibold text-base">{title}</p>
      {description && <p className="text-sm text-gray-400 mt-1.5 max-w-md mx-auto leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
