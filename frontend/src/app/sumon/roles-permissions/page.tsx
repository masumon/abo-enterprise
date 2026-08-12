"use client";

import { useEffect, useState } from "react";
import AdminTitle from "@/components/admin/AdminTitle";
import { adminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { Loader2, ShieldCheck } from "lucide-react";
import { useToastStore } from "@/store/toast";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

export default function RolesPermissionsPage() {
  const toast = useToastStore((s) => s.push);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await adminApi.getRolesPermissions();
        setRoles(r.data.data.roles);
        setPermissions(r.data.data.permissions);
      } catch (e) {
        toast("error", apiErrorMessage(e, "Failed to load roles & permissions"));
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  // Every permission identifier that appears for any role, in first-seen order.
  const allPermissions: string[] = [];
  for (const role of roles) {
    for (const perm of permissions[role] ?? []) {
      if (!allPermissions.includes(perm)) allPermissions.push(perm);
    }
  }

  const grants = (role: string, perm: string) => {
    const perms = permissions[role] ?? [];
    return perms.includes("*") || perms.includes(perm);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-6 h-6 text-brand-600" />
        <AdminTitle en="Roles & Permissions" bn="ভূমিকা ও অনুমতি" />
      </div>
      <p className="text-sm text-muted mb-6">
        Read-only view of the exact permission matrix the backend enforces
        (app/core/rbac.py). Changing it requires a backend code change.
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        </div>
      ) : (
        <div className="overflow-x-auto border border-app rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-2 text-left">
                <th className="px-3 py-2 font-semibold">Permission</th>
                {roles.map((role) => (
                  <th key={role} className="px-3 py-2 font-semibold text-center whitespace-nowrap">
                    {ROLE_LABELS[role] ?? role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPermissions.map((perm, i) => (
                <tr key={perm} className={i % 2 ? "bg-surface-2/40" : ""}>
                  <td className="px-3 py-2 font-mono text-xs">{perm}</td>
                  {roles.map((role) => (
                    <td key={role} className="px-3 py-2 text-center">
                      {grants(role, perm) ? (
                        <span className="text-green-600 dark:text-green-400">✓</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
