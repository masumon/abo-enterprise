"use client";

import Link from "next/link";
import { MapPin, Phone, Mail, Clock, Facebook, MessageCircle } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import GlassCard from "@/components/ui/GlassCard";

export default function ContactSection() {
  const { lang } = useLanguageStore();

  return (
    <section id="contact" className="py-16 gradient-surface">
      <div className="container mx-auto px-4">
        <div className="section-title text-center mb-10">
          <h2>{lang === "bn" ? "যোগাযোগ করুন" : "Get In Touch"}</h2>
          <div className="section-divider" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <GlassCard className="p-6 space-y-4 lg:col-span-1">
            <h3 className="font-bold text-gray-900 text-lg">
              {lang === "bn" ? "আমাদের তথ্য" : "Our Information"}
            </h3>
            <div className="space-y-3">
              {[
                { icon: MapPin, label: lang === "bn" ? "হাজি বাহার উদ্দিন মার্কেট, সিলেট-৩১৭০" : "Hazi Bahar Uddin Market, Sylhet-3170", href: "https://maps.google.com/?q=Sylhet" },
                { icon: Phone, label: "+880 1825 007977", href: "tel:+8801825007977" },
                { icon: Mail, label: "abo.enterprise@gmail.com", href: "mailto:abo.enterprise@gmail.com" },
                { icon: Clock, label: lang === "bn" ? "শনি–বৃহঃ, সকাল ৯টা–রাত ৮টা" : "Sat–Thu, 9:00 AM – 8:00 PM", href: null },
              ].map(({ icon: Icon, label, href }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-accent-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-accent-500" />
                  </div>
                  {href ? (
                    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-brand-600 transition-colors pt-2">{label}</a>
                  ) : (
                    <span className="text-sm text-gray-600 pt-2">{label}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <a href="https://www.facebook.com/abo.enterprise" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white hover:bg-blue-700" aria-label="Facebook">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="https://wa.me/8801825007977" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center text-white hover:bg-green-600" aria-label="WhatsApp">
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </GlassCard>

          <GlassCard className="overflow-hidden p-0 lg:col-span-2">
            <iframe
              title="ABO Enterprise Map"
              src="https://maps.google.com/maps?q=Hazi+Bahar+Uddin+Market+Sylhet&output=embed"
              className="w-full h-64 lg:h-full min-h-[16rem] border-0"
              loading="lazy"
            />
          </GlassCard>
        </div>

        <div className="text-center mt-8">
          <Link href="/contact" className="btn btn-brand btn-md btn-ripple">
            {lang === "bn" ? "সম্পূর্ণ যোগাযোগ পেজ" : "Full Contact Page"}
          </Link>
        </div>
      </div>
    </section>
  );
}
