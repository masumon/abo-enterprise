"use client";

import { useCallback, useEffect, useState } from "react";
import { Fingerprint, Loader2, Plus, Trash2 } from "lucide-react";
import { deviceName, passkeyAdminApi, passkeyError, passkeySupported, registerPasskey } from "@/lib/passkey";
import { useToastStore } from "@/store/toast";

type Item = { id: string; name: string; created_at: string | null; last_used_at: string | null };
const when = (d: string | null) => (d ? new Date(d).toLocaleString("bn-BD", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

/** Admin → Security: sign in with fingerprint / face (passkeys) — add this device, list, remove. */
export default function PasskeyCard({ className = "" }: { className?: string }) {
  const toast = useToastStore((s) => s.push);
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState("");
  const [supported, setSupported] = useState(true);

  const load = useCallback(() => {
    Promise.resolve().then(() => passkeyAdminApi.list()).then((r) => setItems(r?.data?.data ?? [])).catch(() => setItems([]));
  }, []);
  useEffect(() => { setSupported(passkeySupported()); load(); }, [load]);

  const add = async () => {
    setBusy("add");
    try {
      await registerPasskey("admin", deviceName());
      toast("success", "এই ডিভাইস যোগ হয়েছে — এখন থেকে আঙুলের ছাপ/মুখ দিয়ে লগইন করতে পারবেন");
      load();
    } catch (e) {
      toast("error", passkeyError(e));
    } finally {
      setBusy("");
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm("এই ডিভাইস থেকে আঙুলের ছাপ দিয়ে লগইন বন্ধ করবেন?")) return;
    setBusy(id);
    try { await passkeyAdminApi.remove(id); load(); } catch (e) { toast("error", passkeyError(e)); } finally { setBusy(""); }
  };

  return (
    <section className={className} aria-labelledby="passkey-title">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 flex items-center justify-center flex-none"><Fingerprint className="w-5 h-5" /></span>
        <div className="min-w-0">
          <h2 id="passkey-title" className="text-lg font-bold text-heading">আঙুলের ছাপ / মুখ দিয়ে লগইন (পাসকি)</h2>
          <p className="text-sm text-muted">একবার চালু করলে এই ফোন/ল্যাপটপে পাসওয়ার্ড ছাড়াই আঙুলের ছাপ, মুখ বা স্ক্রিন-লক দিয়ে এক চাপে লগইন। ভুয়া (phishing) সাইটে কাজ করে না — পাসওয়ার্ডের চেয়েও নিরাপদ। পাসওয়ার্ড ও ২-ধাপ যাচাই আগের মতোই থাকবে।</p>
        </div>
      </div>
      {!supported ? (
        <p className="mt-3 text-sm text-amber-700">এই ব্রাউজারে পাসকি চলছে না — Chrome/Safari/Edge-এর নতুন সংস্করণ ব্যবহার করুন।</p>
      ) : (
        <>
          <ul className="mt-4 space-y-2">
            {items === null && <li className="h-11 rounded-lg bg-gray-100 dark:bg-white/5 animate-pulse" />}
            {items?.length === 0 && <li className="text-sm text-muted">এখনো কোনো ডিভাইস যোগ করা হয়নি।</li>}
            {items?.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-2">
                <Fingerprint className="w-4 h-4 text-brand-600 flex-none" />
                <span className="flex-1 min-w-0 text-sm"><span className="font-medium text-heading">{p.name}</span>
                  <span className="block text-xs text-muted">যোগ: {when(p.created_at)} · শেষ ব্যবহার: {when(p.last_used_at)}</span></span>
                <button type="button" onClick={() => remove(p.id)} disabled={busy === p.id} aria-label="সরান" className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600">
                  {busy === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={add} disabled={!!busy} className="btn btn-brand btn-md mt-3 gap-2 min-h-11">
            {busy === "add" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} এই ডিভাইস যোগ করুন
          </button>
        </>
      )}
    </section>
  );
}
