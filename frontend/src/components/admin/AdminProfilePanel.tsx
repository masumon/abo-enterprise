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
  const link = "flex items-center gap-2.5 min-h-10 px-2.5 rounded-lg text-[13px] font-medium text-gray-800 dark:text-gray-100 hover:bg-brand-50 dark:hover:bg-white/5";

  return (
    <div data-no-guard className="fixed inset-0 z-50 bg-black/30 flex items-start justify-end p-3 pt-[4.25rem] sm:pt-16" role="dialog" aria-modal="true" aria-label="আমার প্রোফাইল" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="w-full max-w-[18.5rem] max-h-[calc(100dvh-5.5rem)] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 animate-scale-in">
        <div className="relative px-4 pt-4 pb-3 bg-gradient-to-br from-brand-50 to-white dark:from-white/5 dark:to-transparent text-center">
          <button type="button" onClick={close} aria-label="বন্ধ করুন" className="absolute right-1.5 top-1.5 min-h-10 min-w-10 flex items-center justify-center rounded-full text-gray-400 hover:bg-black/5 dark:hover:bg-white/10"><X className="w-4 h-4" /></button>
          <AdminAvatar name={user.name} className="w-16 h-16 text-xl mx-auto ring-2 ring-white dark:ring-white/20 shadow" />
          <p className="mt-2 text-sm font-bold text-gray-900 dark:text-gray-100 break-words leading-tight">{user.name}</p>
          <span className="inline-block mt-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">{ROLE_BN[user.role] ?? user.role}</span>
          <p className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 break-all"><Mail className="w-3 h-3 flex-none" aria-hidden />{user.email}</p>
          <button type="button" onClick={() => setChanging((c) => !c)} className="mt-1.5 text-xs font-semibold text-brand-600 dark:text-brand-300 min-h-8 px-2 hover:underline">{avatar ? "ছবি বদলান" : "ছবি যোগ করুন"}</button>
        </div>

        {changing && (
          <div className="mx-3 mb-2 rounded-xl border border-gray-200 dark:border-white/10 p-2">
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

        <div className={`mx-3 mb-2 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${totp ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"}`}>
          {totp ? <ShieldCheck className="w-4 h-4 flex-none" aria-hidden /> : <ShieldOff className="w-4 h-4 flex-none" aria-hidden />}
          <span className="flex-1">{totp === null ? "২-ধাপ যাচাইয়ের অবস্থা জানা যায়নি" : totp ? "২-ধাপ যাচাই চালু" : "২-ধাপ যাচাই বন্ধ"}</span>
        </div>

        <nav className="px-2 pb-1" aria-label="অ্যাকাউন্ট">
          <Link href="/sumon/security" onClick={close} className={link}><KeyRound className="w-4 h-4 text-brand-600 flex-none" aria-hidden />নিরাপত্তা (২-ধাপ, আঙুলের ছাপ)</Link>
          <Link href="/sumon/settings" onClick={close} className={link}><Settings className="w-4 h-4 text-brand-600 flex-none" aria-hidden />সাইট সেটিংস</Link>
          <Link href="/sumon/help" onClick={close} className={link}><HelpCircle className="w-4 h-4 text-brand-600 flex-none" aria-hidden />সহায়তা গাইড</Link>
          <a href="/" target="_blank" rel="noopener noreferrer" className={link}><ExternalLink className="w-4 h-4 text-brand-600 flex-none" aria-hidden />ওয়েবসাইট দেখুন</a>
        </nav>

        <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-white/10 mt-1">
          <button type="button" onClick={() => { close(); onLogout(); }} className="w-full min-h-10 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20">
            <LogOut className="w-4 h-4" aria-hidden /> লগআউট
          </button>
        </div>
      </div>
    </div>
  );
}
