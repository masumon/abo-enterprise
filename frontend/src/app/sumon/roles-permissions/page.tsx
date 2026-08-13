"use client";

import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { adminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { Loader2 } from "lucide-react";
import { useToastStore } from "@/store/toast";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

const AREA_LABELS: Record<string, string> = {
  orders: "Orders", invoices: "Invoices", payments: "Payments", products: "Products",
  services: "Services", bookings: "Bookings", customers: "Customers", leads: "Leads",
  career: "Career Applications", reviews: "Product Reviews", blog: "Blog", pages: "Pages",
  media: "Image Manager", email_templates: "Email Templates", settings: "Settings",
  users: "Users", audit_logs: "Audit Logs", analytics: "Reports & Analytics", ops: "Operations",
};

/** Turns a raw backend permission id like "orders.read" into "Orders — View". */
function humanizePermission(perm: string): string {
  const [area, action] = perm.split(".");
  const areaLabel = AREA_LABELS[area] ?? area.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const actionLabel = action === "read" ? "View" : action === "write" ? "Edit" : action ?? "";
  return actionLabel ? `${areaLabel} — ${actionLabel}` : areaLabel;
}

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
  // "*" is a wildcard sentinel (full access), not a real permission — excluded from the list.
  const allPermissions: string[] = [];
  for (const role of roles) {
    for (const perm of permissions[role] ?? []) {
      if (perm !== "*" && !allPermissions.includes(perm)) allPermissions.push(perm);
    }
  }

  const grants = (role: string, perm: string) => {
    const perms = permissions[role] ?? [];
    return perms.includes("*") || perms.includes(perm);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <AdminPageHeader
        title="Roles & Permissions"
        titleBn="ভূমিকা ও অনুমতি"
        description="Shows exactly what each role can do. This is a reference view — to change what a role can access, contact your developer. To change who has which role, use the Users page."
        descriptionBn="প্রতিটি ভূমিকা কী করতে পারে তা এখানে দেখানো হয়েছে। এটি শুধু দেখার জন্য — কোনো ভূমিকার অনুমতি পরিবর্তন করতে ডেভেলপারের সাথে যোগাযোগ করুন। কোন ইউজারের কোন ভূমিকা তা পরিবর্তন করতে Users পেজ ব্যবহার করুন।"
      />

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
                  <td className="px-3 py-2 text-sm" title={perm}>{humanizePermission(perm)}</td>
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
