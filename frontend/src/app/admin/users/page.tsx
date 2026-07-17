"use client";

import { useEffect, useState } from "react";
import AdminTitle from "@/components/admin/AdminTitle";
import { adminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { Loader2, Users, Shield, Plus, Pencil, X, Search } from "lucide-react";
import { useToastStore } from "@/store/toast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import TwoFactorCard from "@/components/admin/TwoFactorCard";
import { useFocusTrap } from "@/lib/useFocusTrap";

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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminUsersPage() {
  const toast = useToastStore((s) => s.push);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "admin" });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const modalRef = useFocusTrap(!!modal, () => {
    setModal(null);
    setEditing(null);
  });

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
    if (modal === "create") {
      if (!form.email.trim() || !form.password.trim()) { toast("error", "Email and password are required"); return; }
      if (!EMAIL_RE.test(form.email)) { toast("error", "Enter a valid email address"); return; }
      if (form.password.length < 6) { toast("error", "Password must be at least 6 characters"); return; }
    }
    setSaving(true);
    try {
      if (modal === "create") {
        await adminApi.createUser(form);
        toast("success", "User created");
      } else if (editing) {
        const payload: { name: string; role: string; password?: string } = { name: form.name, role: form.role };
        if (form.password.trim()) payload.password = form.password;
        await adminApi.updateUser(editing.id, payload);
        toast("success", "User updated");
      }
      closeModal();
      await load();
    } catch (err) {
      toast("error", apiErrorMessage(err, modal === "create" ? "Create failed" : "Update failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = (u: AdminUser) => {
    const action = u.is_active ? "deactivate" : "activate";
    setConfirm({
      title: `${u.is_active ? "Deactivate" : "Activate"} "${u.name}"?`,
      message: u.is_active
        ? "This user will no longer be able to log in."
        : "This user will regain access to the admin panel.",
      action: async () => {
        setConfirm(null);
        setBusyId(u.id);
        try {
          await adminApi.updateUser(u.id, { is_active: !u.is_active });
          setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: !u.is_active } : x)));
          toast("success", u.is_active ? "User deactivated" : "User activated");
        } catch {
          toast("error", `Failed to ${action} user`);
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <TwoFactorCard />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-brand-600" />
          <div>
            <AdminTitle en="Users" bn="ইউজার" />
            <p className="text-gray-500 text-sm">{users.length} admin accounts</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users…"
              className="input pl-8 text-sm w-full sm:w-52"
              aria-label="Search users"
            />
          </div>
          <button onClick={openCreate} className="btn btn-brand btn-md flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="sm:hidden divide-y divide-gray-100">
            {filtered.map((u) => (
              <div key={u.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => openEdit(u)} className="text-left min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="badge bg-brand-50 text-brand-700 capitalize">{u.role.replace(/_/g, " ")}</span>
                      <span className={`text-xs font-medium ${u.is_active ? "text-green-600" : "text-red-500"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(u)}
                      aria-label={`Edit ${u.name}`}
                      className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg hover:bg-brand-50"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(u)}
                      disabled={busyId === u.id}
                      aria-label={u.is_active ? `Deactivate ${u.name}` : `Activate ${u.name}`}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-40"
                    >
                      {busyId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto hidden sm:block">
            <table className="table-premium min-w-[500px]">
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="hidden sm:table-cell">Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="hidden lg:table-cell">Last Login</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} onClick={() => openEdit(u)} className="cursor-pointer hover:bg-brand-50/40 transition-colors">
                    <td className="font-medium">
                      <div>
                        <p>{u.name}</p>
                        <p className="text-xs text-gray-400 sm:hidden">{u.email}</p>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell">{u.email}</td>
                    <td><span className="badge bg-brand-50 text-brand-700 capitalize">{u.role.replace(/_/g, " ")}</span></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleActive(u)}
                        disabled={busyId === u.id}
                        aria-label={u.is_active ? "Deactivate user" : "Activate user"}
                        className={`text-sm font-medium disabled:opacity-40 ${u.is_active ? "text-green-600 hover:underline" : "text-red-500 hover:underline"}`}
                      >
                        {busyId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : u.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="text-gray-500 text-xs hidden lg:table-cell">
                      {u.last_login ? new Date(u.last_login).toLocaleString("en-BD") : "—"}
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          aria-label={`Edit ${u.name}`}
                          className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg hover:bg-brand-50"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={busyId === u.id}
                          aria-label={u.is_active ? `Deactivate ${u.name}` : `Activate ${u.name}`}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-40"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="p-8 text-center text-gray-500">{search ? "No users match your search" : "No users found"}</p>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={modal === "create" ? "Create user" : "Edit user"}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div ref={modalRef} className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-600" />
                {modal === "create" ? "New Admin User" : "Edit User"}
              </h2>
              <button onClick={closeModal} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              {modal === "create" && (
                <div>
                  <label className="form-label" htmlFor="user-email">Email</label>
                  <input
                    id="user-email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="input w-full"
                  />
                </div>
              )}
              <div>
                <label className="form-label" htmlFor="user-name">Name</label>
                <input
                  id="user-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="form-label" htmlFor="user-role">Role</label>
                <select
                  id="user-role"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="input w-full"
                >
                  {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r.replace(/_/g, " ")}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {form.role === "admin" && "Full access except user management"}
                  {form.role === "editor" && "Can manage blog, products, services only"}
                  {form.role === "viewer" && "Read-only access to all sections"}
                </p>
              </div>
              <div>
                <label className="form-label" htmlFor="user-password">
                  {modal === "create" ? "Password" : "New Password"}
                  {modal === "edit" && <span className="text-gray-400 font-normal ml-1">(leave blank to keep current)</span>}
                </label>
                <input
                  id="user-password"
                  type="password"
                  autoComplete={modal === "create" ? "new-password" : "off"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="input w-full"
                  placeholder={modal === "edit" ? "Leave blank to keep current" : "Min. 6 characters"}
                />
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

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.title.startsWith("Deactivate") ? "Deactivate" : "Confirm"}
        variant={confirm?.title.startsWith("Deactivate") ? "danger" : "warning"}
        onConfirm={() => confirm?.action()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
