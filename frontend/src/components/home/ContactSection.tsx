"use client";

import { MapPin, Phone, Mail, Clock, Facebook, MessageCircle } from "lucide-react";
import { useLanguageStore } from "@/store/language";

export default function ContactSection() {
  const { lang } = useLanguageStore();

  return (
    <section id="contact" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="section-title text-center mb-10">
          <h2>{lang === "bn" ? "যোগাযোগ করুন" : "Get In Touch"}</h2>
          <div className="section-divider" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">
              {lang === "bn" ? "আমাদের তথ্য" : "Our Information"}
            </h3>

            <div className="space-y-3">
              {[
                {
                  icon: MapPin,
                  label: lang === "bn" ? "হাজি বাহার উদ্দিন মার্কেট, সিলেট-৩১৭০" : "Hazi Bahar Uddin Market, Sylhet-3170",
                  href: "https://maps.google.com/?q=Sylhet",
                },
                {
                  icon: Phone,
                  label: "+880 1825 007977",
                  href: "tel:+8801825007977",
                },
                {
                  icon: Mail,
                  label: "abo.enterprise@gmail.com",
                  href: "mailto:abo.enterprise@gmail.com",
                },
                {
                  icon: Clock,
                  label: lang === "bn" ? "শনি–বৃহঃ, সকাল ৯টা–রাত ৮টা" : "Sat–Thu, 9:00 AM – 8:00 PM",
                  href: null,
                },
              ].map(({ icon: Icon, label, href }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-accent-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-accent-500" />
                  </div>
                  {href ? (
                    <a href={href} className="text-sm text-gray-600 hover:text-brand-600 transition-colors pt-2">
                      {label}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-600 pt-2">{label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">
              {lang === "bn" ? "সোশ্যাল মিডিয়া" : "Follow Us"}
            </h3>
            <p className="text-sm text-gray-500">
              {lang === "bn"
                ? "আমাদের Facebook পেজ ফলো করুন এবং WhatsApp-এ সরাসরি যোগাযোগ করুন।"
                : "Follow our Facebook page and contact us directly via WhatsApp."}
            </p>
            <div className="space-y-3">
              <a
                href="https://www.facebook.com/abo.enterprise"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Facebook className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">Facebook Page</p>
                  <p className="text-xs text-gray-500">facebook.com/abo.enterprise</p>
                </div>
              </a>
              <a
                href="https://wa.me/8801825007977"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-green-100 bg-green-50 hover:bg-green-100 transition-colors"
              >
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">WhatsApp</p>
                  <p className="text-xs text-gray-500">+880 1825 007977</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
