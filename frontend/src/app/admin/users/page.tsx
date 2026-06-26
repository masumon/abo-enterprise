"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Loader2, Users, Shield } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<{ id: string; email: string; name: string; role: string; is_active: boolean; last_login: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.listUsers()
      .then((r) => setUsers(r.data.data ?? []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-brand-600" />
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : (
        <div className="admin-card overflow-hidden">
          <table className="table-premium">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className="badge bg-brand-50 text-brand-700">{u.role}</span></td>
                  <td>{u.is_active ? <span className="text-green-600">Active</span> : <span className="text-red-500">Inactive</span>}</td>
                  <td className="text-gray-500 text-xs">{u.last_login ? new Date(u.last_login).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="p-8 text-center text-gray-500">No users found</p>}
        </div>
      )}
    </div>
  );
}
