"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Loader2, Users, Shield, Plus, Pencil, Trash2, X } from "lucide-react";
import { useToastStore } from "@/store/toast";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at?: string;
}

const ROLES = ["admin", "editor", "viewer"];

export default function AdminUsersPage() {
  const toast = useToastStore((s) => s.push);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "admin" });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.listUsers();
      setUsers(r.data.data ?? []);
    } catch {
      toast("error", "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ email: "", password: "", name: "", role: "admin" });
    setModal("create");
  };

  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setForm({ email: u.email, password: "", name: u.name, role: u.role });
    setModal("edit");
  };

  const closeModal = () => { setModal(null); setEditing(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast("error", "Name is required"); return; }
    if (modal === "create" && (!form.email.trim() || !form.password.trim())) {
      toast("error", "Email and password are required");
      return;
    }
    setSaving(true);
    try {
      if (modal === "create") {
        await adminApi.createUser(form);
        toast("success", "User created");
      } else if (editing) {
        const payload: { name: string; role: string; password?: string } = {
          name: form.name,
          role: form.role,
        };
        if (form.password.trim()) payload.password = form.password;
        await adminApi.updateUser(editing.id, payload);
        toast("success", "User updated");
      }
      closeModal();
      await load();
    } catch {
      toast("error", modal === "create" ? "Create failed" : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (u: AdminUser) => {
    if (!confirm(`Deactivate "${u.name}"? They will no longer be able to log in.`)) return;
    setBusyId(u.id);
    try {
      await adminApi.deactivateUser(u.id);
      toast("success", "User deactivated");
      await load();
    } catch {
      toast("error", "Deactivate failed");
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (u: AdminUser) => {
    setBusyId(u.id);
    try {
      await adminApi.updateUser(u.id, { is_active: !u.is_active });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: !u.is_active } : x)));
      toast("success", u.is_active ? "User deactivated" : "User activated");
    } catch {
      toast("error", "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-brand-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-gray-500 text-sm">{users.length} admin accounts</p>
          </div>
        </div>
        <button onClick={openCreate} className="btn btn-brand btn-md flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add User
        </button>
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
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className="badge bg-brand-50 text-brand-700 capitalize">{u.role}</span></td>
                  <td>
                    <button
                      onClick={() => toggleActive(u)}
                      disabled={busyId === u.id}
                      className={u.is_active ? "text-green-600 hover:underline" : "text-red-500 hover:underline"}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="text-gray-500 text-xs">{u.last_login ? new Date(u.last_login).toLocaleString() : "—"}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg hover:bg-brand-50">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {u.is_active && (
                        <button
                          onClick={() => handleDeactivate(u)}
                          disabled={busyId === u.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="p-8 text-center text-gray-500">No users found</p>}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-600" />
                {modal === "create" ? "New Admin User" : "Edit User"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              {modal === "create" && (
                <div>
                  <label className="form-label">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input w-full" />
                </div>
              )}
              <div>
                <label className="form-label">Name</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input w-full" />
              </div>
              <div>
                <label className="form-label">Role</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="input w-full">
                  {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">{modal === "create" ? "Password" : "New Password (optional)"}</label>
                <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="input w-full" placeholder={modal === "edit" ? "Leave blank to keep current" : ""} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={closeModal} className="btn btn-outline btn-md">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-brand btn-md">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : modal === "create" ? "Create" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
