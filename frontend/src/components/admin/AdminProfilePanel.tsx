"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, HelpCircle, KeyRound, LogOut, Mail, Settings, ShieldCheck, ShieldOff, X } from "lucide-react";
import { authApi } from "@/lib/api";
import { useProfileStore } from "@/store/adminProfile";
import { useToastStore } from "@/store/toast";
import AdminAvatar from "@/components/admin/AdminAvatar";
import ImageUpload from "@/components/admin/ImageUpload";

const ROLE_BN: Record<string, string> = {
  super_admin: "মালিক (সুপার অ্যাডমিন)", admin: "অ্যাডমিন", editor: "এডিটর", viewer: "শুধু দেখতে পারেন",
};

/** The signed-in admin's own card: photo, name, email, role, 2-step status and the
 * account links. Opened from the sidebar logo/user block and the top-bar avatar —
 * mounted once in the admin layout. */
export default function AdminProfilePanel({ user, onLogout }: { user: { id: string; name: string; email: string; role: string }; onLogout: () => void }) {
  const { open, setOpen, saveAvatar, avatar } = useProfileStore();
  const toast = useToastStore((s) => s.push);
  const [totp, setTotp] = useState<boolean | null>(null);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    if (!open) return;
    authApi.getMe().then((r) => setTotp(!!r.data.data?.totp_enabled)).catch(() => setTotp(null));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;
  const close = () => setOpen(false);
  const link = "flex items-center gap-3 min-h-12 px-3 rounded-xl text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-white/5";

  return (
    <div data-no-guard className="admin-overlay admin-overlay--panel fixed inset-0 z-50 bg-black/40" role="dialog" aria-modal="true" aria-label="আমার প্রোফাইল" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="admin-sheet admin-sheet--s w-full max-w-sm h-full ml-auto flex flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">আমার প্রোফাইল</h2>
          <button type="button" onClick={close} aria-label="বন্ধ করুন" className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div className="flex flex-col items-center text-center gap-2">
            <AdminAvatar name={user.name} className="w-24 h-24 text-3xl ring-4 ring-brand-100 dark:ring-white/10" />
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 break-words">{user.name}</p>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{ROLE_BN[user.role] ?? user.role}</span>
            <p className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 break-all"><Mail className="w-4 h-4 flex-none" aria-hidden />{user.email}</p>
            <button type="button" onClick={() => setChanging((c) => !c)} className="btn btn-outline btn-sm min-h-11 mt-1">{avatar ? "ছবি বদলান" : "ছবি যোগ করুন"}</button>
          </div>

          {changing && (
            <div className="rounded-xl border border-gray-200 dark:border-white/10 p-3">
              <ImageUpload
                value={avatar}
                folder="abo-enterprise/admins"
                label="প্রোফাইল ছবি (বর্গাকার ভালো)"
                showUrlInput={false}
                previewSize="sm"
                onChange={async (url) => {
                  const r = await saveAvatar(user.id, url);
                  toast(r === "saved" ? "success" : "info", r === "saved" ? "ছবি সংরক্ষিত হয়েছে" : "ছবি এই ডিভাইসে সংরক্ষিত হয়েছে");
                  setChanging(false);
                }}
              />
            </div>
          )}

          <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${totp ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"}`}>
            {totp ? <ShieldCheck className="w-5 h-5 flex-none" aria-hidden /> : <ShieldOff className="w-5 h-5 flex-none" aria-hidden />}
            <span className="flex-1">{totp === null ? "২-ধাপ যাচাইয়ের অবস্থা জানা যায়নি" : totp ? "২-ধাপ যাচাই চালু আছে" : "২-ধাপ যাচাই বন্ধ — চালু করলে অ্যাকাউন্ট আরও নিরাপদ"}</span>
          </div>

          <nav className="space-y-0.5" aria-label="অ্যাকাউন্ট">
            <Link href="/sumon/security" onClick={close} className={link}><KeyRound className="w-4 h-4 text-brand-600" aria-hidden />নিরাপত্তা (২-ধাপ, আঙুলের ছাপ)</Link>
            <Link href="/sumon/settings" onClick={close} className={link}><Settings className="w-4 h-4 text-brand-600" aria-hidden />সাইট সেটিংস</Link>
            <Link href="/sumon/help" onClick={close} className={link}><HelpCircle className="w-4 h-4 text-brand-600" aria-hidden />সহায়তা গাইড</Link>
            <a href="/" target="_blank" rel="noopener noreferrer" className={link}><ExternalLink className="w-4 h-4 text-brand-600" aria-hidden />ওয়েবসাইট দেখুন</a>
          </nav>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 dark:border-white/10">
          <button type="button" onClick={() => { close(); onLogout(); }} className="btn btn-outline w-full min-h-12 gap-2 justify-center !border-red-300 !text-red-600 hover:!bg-red-50 dark:!border-red-500/40 dark:!text-red-300">
            <LogOut className="w-4 h-4" aria-hidden /> লগআউট
          </button>
        </div>
      </div>
    </div>
  );
}
