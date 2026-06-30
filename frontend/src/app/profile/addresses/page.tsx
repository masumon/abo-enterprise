"use client";

import { useEffect, useState } from "react";
import { MapPin, Plus, Trash2, Star } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useCustomerProfileStore } from "@/store/customerProfile";
import PageHero from "@/components/ui/PageHero";
import GlassCard from "@/components/ui/GlassCard";

export default function AddressesPage() {
  const { lang } = useLanguageStore();
  const { addresses, addAddress, removeAddress, setDefaultAddress } = useCustomerProfileStore();
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    useCustomerProfileStore.persist.rehydrate();
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || address.trim().length < 10 || !/^0[13-9]\d{8}$/.test(phone)) return;
    addAddress({
      label: label.trim(),
      address: address.trim(),
      phone,
      isDefault: addresses.length === 0,
    });
    setLabel("");
    setAddress("");
    setPhone("");
  };

  return (
    <main>
      <PageHero
        title={lang === "bn" ? "ঠিকানা" : "Addresses"}
        subtitle={lang === "bn" ? "ডেলিভারি ঠিকানা সংরক্ষণ করুন" : "Save delivery addresses for faster checkout"}
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "প্রোফাইল" : "Profile", href: "/profile" },
          { label: lang === "bn" ? "ঠিকানা" : "Addresses" },
        ]}
      />
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {addresses.length === 0 ? (
          <GlassCard className="p-6 text-center text-muted">
            {lang === "bn" ? "কোনো ঠিকানা সংরক্ষিত নেই" : "No saved addresses"}
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {addresses.map((a) => (
              <GlassCard key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 min-w-0">
                    <MapPin className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-semibold text-heading flex items-center gap-2">
                        {a.label}
                        {a.isDefault && (
                          <span className="text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                            {lang === "bn" ? "ডিফল্ট" : "Default"}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted mt-1">{a.address}</p>
                      <p className="text-sm text-muted">{a.phone}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!a.isDefault && (
                      <button type="button" onClick={() => setDefaultAddress(a.id)} className="w-8 h-8 rounded-lg hover:bg-brand-50 flex items-center justify-center" aria-label="Set default">
                        <Star className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                    <button type="button" onClick={() => removeAddress(a.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-500" aria-label="Remove">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        <GlassCard className="p-5">
          <h2 className="font-bold text-heading mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {lang === "bn" ? "নতুন ঠিকানা" : "Add Address"}
          </h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={lang === "bn" ? "লেবেল (যেমন: বাড়ি)" : "Label (e.g. Home)"} className="input" required />
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder={lang === "bn" ? "সম্পূর্ণ ঠিকানা" : "Full address"} className="input resize-none" rows={3} required />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="input" required />
            <button type="submit" className="btn btn-brand btn-md w-full">{lang === "bn" ? "সংরক্ষণ" : "Save Address"}</button>
          </form>
        </GlassCard>
      </div>
    </main>
  );
}
