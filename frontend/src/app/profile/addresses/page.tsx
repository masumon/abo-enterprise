"use client";

import { useEffect, useState } from "react";
import { MapPin, Plus, Trash2, Star } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { BD_PHONE_REGEX, BD_PHONE_PLACEHOLDER } from "@/lib/phone";
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

  // GAP-06 — the three validation rules previously caused a bare return with
  // no feedback, so Save appeared to do nothing. Each rule now names what is
  // wrong and why it matters, in delivery terms: Bangladeshi addresses are
  // landmark-based, and a technically valid but vague address is the common
  // cause of a failed delivery.
  const errors = {
    label: !label.trim()
      ? lang === "bn"
        ? "একটি নাম দিন যাতে checkout-এ বেছে নিতে পারেন — যেমন “বাড়ি” বা “দোকান”।"
        : "Give it a name so you can pick it at checkout — “Home” or “Shop”."
      : null,
    address: address.trim().length < 10
      ? lang === "bn"
        ? "খুব ছোট। বাসা, রোড ও এলাকা লিখুন — রাইডারকে খুঁজে পেতে হবে।"
        : "Too short. Include house, road and area — the rider needs to find it."
      : null,
    phone: !BD_PHONE_REGEX.test(phone)
      ? lang === "bn"
        ? "বাংলাদেশি মোবাইল নম্বর ১১ সংখ্যার, ০১ দিয়ে শুরু।"
        : "A Bangladeshi mobile number has 11 digits, starting 01."
      : null,
  };
  const isValid = !errors.label && !errors.address && !errors.phone;
  const [attempted, setAttempted] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (!isValid) return;
    setAttempted(false);
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
        pageKey="profile"
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
            <div>
              <input
                id="address-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={lang === "bn" ? "লেবেল (যেমন: বাড়ি)" : "Label (e.g. Home)"}
                aria-label={lang === "bn" ? "লেবেল (যেমন: বাড়ি)" : "Label (e.g. Home)"}
                className="input"
                aria-invalid={attempted && !!errors.label}
                aria-describedby={attempted && errors.label ? "address-label-error" : undefined}
                required
              />
              {attempted && errors.label && <p id="address-label-error" className="text-xs text-red-500 mt-1">{errors.label}</p>}
            </div>
            <div>
              <textarea
                id="address-full"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={lang === "bn" ? "সম্পূর্ণ ঠিকানা" : "Full address"}
                aria-label={lang === "bn" ? "সম্পূর্ণ ঠিকানা" : "Full address"}
                className="input resize-none"
                rows={3}
                aria-invalid={attempted && !!errors.address}
                aria-describedby={attempted && errors.address ? "address-full-error" : undefined}
                required
              />
              {attempted && errors.address && <p id="address-full-error" className="text-xs text-red-500 mt-1">{errors.address}</p>}
            </div>
            <div>
              <input
                id="address-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={BD_PHONE_PLACEHOLDER}
                aria-label={BD_PHONE_PLACEHOLDER}
                className="input"
                aria-invalid={attempted && !!errors.phone}
                aria-describedby={attempted && errors.phone ? "address-phone-error" : undefined}
                required
              />
              {attempted && errors.phone && <p id="address-phone-error" className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
            <button type="submit" disabled={attempted && !isValid} className="btn btn-brand btn-md w-full disabled:opacity-50 disabled:cursor-not-allowed">{lang === "bn" ? "সংরক্ষণ" : "Save Address"}</button>
            {attempted && !isValid && (
              <p className="text-xs text-muted text-center">
                {lang === "bn" ? "উপরের ফিল্ডগুলো ঠিক করলে সংরক্ষণ হবে" : "Fix the fields above to save"}
              </p>
            )}
          </form>
        </GlassCard>
      </div>
    </main>
  );
}
