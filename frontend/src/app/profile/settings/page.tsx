"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, Save } from "lucide-react";
import { useCustomerStore } from "@/store/customer";
import { useCustomerProfileStore } from "@/store/customerProfile";
import { BD_PHONE_REGEX, BD_PHONE_ERROR_EN, BD_PHONE_ERROR_BN } from "@/lib/phone";
import { useLanguageStore } from "@/store/language";
import { useRouter } from "next/navigation";
import PageHero from "@/components/ui/PageHero";
import GlassCard from "@/components/ui/GlassCard";

export default function SettingsPage() {
  const { lang } = useLanguageStore();
  const router = useRouter();
  const { session, login, logout } = useCustomerStore();
  const { email, notifyOrders, notifyOffers, updateSettings } = useCustomerProfileStore();
  const [name, setName] = useState(session?.name ?? "");
  const [phone, setPhone] = useState(session?.phone ?? "");
  const [saved, setSaved] = useState(false);
  // L2 — invalid input used to fail the save silently (a bare `return`).
  const [attempted, setAttempted] = useState(false);
  const phoneError = !BD_PHONE_REGEX.test(phone) ? (lang === "bn" ? BD_PHONE_ERROR_BN : BD_PHONE_ERROR_EN) : null;
  const nameError = name.trim().length < 2 ? (lang === "bn" ? "নাম দিন (কমপক্ষে ২ অক্ষর)" : "Enter a name (min 2 characters)") : null;

  useEffect(() => {
    useCustomerProfileStore.persist.rehydrate();
    if (session) {
      setName(session.name);
      setPhone(session.phone);
    }
  }, [session]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (phoneError || nameError) return;
    // The session token is bound to the verified phone — a new number
    // must be re-verified with OTP before it can read order history.
    if (!session?.token || phone !== session.phone) {
      logout();
      router.push("/login");
      return;
    }
    login(phone, name.trim(), session.token);
    updateSettings({ email });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <main>
      <PageHero
        pageKey="profile"
        title={lang === "bn" ? "সেটিংস" : "Settings"}
        subtitle={lang === "bn" ? "অ্যাকাউন্ট ও নোটিফিকেশন" : "Account and notification preferences"}
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "প্রোফাইল" : "Profile", href: "/profile" },
          { label: lang === "bn" ? "সেটিংস" : "Settings" },
        ]}
      />
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <GlassCard className="p-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="form-label">{lang === "bn" ? "নাম" : "Name"}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" aria-invalid={attempted && !!nameError} required />
              {attempted && nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
            </div>
            <div>
              <label className="form-label">{lang === "bn" ? "ফোন" : "Phone"}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" aria-invalid={attempted && !!phoneError} required />
              {attempted && phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
            </div>
            <div>
              <label className="form-label">{lang === "bn" ? "ইমেইল (ঐচ্ছিক)" : "Email (optional)"}</label>
              <input type="email" value={email} onChange={(e) => updateSettings({ email: e.target.value })} className="input" />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={notifyOrders} onChange={(e) => updateSettings({ notifyOrders: e.target.checked })} className="rounded" />
              {lang === "bn" ? "অর্ডার আপডেট নোটিফিকেশন" : "Order update notifications"}
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={notifyOffers} onChange={(e) => updateSettings({ notifyOffers: e.target.checked })} className="rounded" />
              {lang === "bn" ? "অফার ও নিউজলেটার" : "Offers & newsletter"}
            </label>
            <button type="submit" className="btn btn-brand btn-md w-full">
              <Save className="w-4 h-4" />
              {saved ? (lang === "bn" ? "সংরক্ষিত!" : "Saved!") : (lang === "bn" ? "সংরক্ষণ করুন" : "Save Changes")}
            </button>
          </form>
          <button type="button" onClick={handleLogout} className="btn btn-outline btn-md w-full mt-4">
            <LogOut className="w-4 h-4" />
            {lang === "bn" ? "লগআউট" : "Sign Out"}
          </button>
          <p className="text-xs text-muted text-center mt-4">
            <Link href="/forgot-password" className="text-brand-600 hover:underline">
              {lang === "bn" ? "সাহায্য প্রয়োজন?" : "Need help signing in?"}
            </Link>
          </p>
        </GlassCard>
      </div>
    </main>
  );
}
