"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { servicesApi } from "@/lib/api";
import type { Service } from "@/types";
import BookingForm from "@/components/booking/BookingForm";
import PageHero from "@/components/ui/PageHero";
import { useLanguageStore } from "@/store/language";

interface BookPageClientProps {
  serviceSlug?: string;
  tierId?: string;
}

export default function BookPageClient({ serviceSlug, tierId }: BookPageClientProps) {
  const { lang } = useLanguageStore();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    if (!serviceSlug) {
      setLoading(false);
      setError(lang === "bn" ? "কোনো সেবা নির্বাচন করা হয়নি।" : "No service selected.");
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await servicesApi.getBySlug(serviceSlug);
        if (!cancelled) setService(res.data.data ?? null);
      } catch {
        if (!cancelled) {
          setService(null);
          setError(lang === "bn" ? "সেবা লোড করা যায়নি।" : "Could not load service.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [serviceSlug, lang]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!service || error) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <p className="text-muted mb-6">{error ?? (lang === "bn" ? "সেবা পাওয়া যায়নি।" : "Service not found.")}</p>
        <Link href="/services" className="btn btn-brand btn-md inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          {lang === "bn" ? "সেবাসমূহ" : "Browse Services"}
        </Link>
      </div>
    );
  }

  if (booked) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-heading mb-2">
          {lang === "bn" ? "বুকিং নিশ্চিত!" : "Booking Confirmed!"}
        </h1>
        <p className="text-muted mb-6">
          {lang === "bn"
            ? "আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব। ইমেইল চেক করুন।"
            : "We'll contact you soon. Check your email for confirmation."}
        </p>
        <Link href={`/services/${service.slug}`} className="btn btn-brand btn-md">
          {lang === "bn" ? "সেবায় ফিরে যান" : "Back to Service"}
        </Link>
      </div>
    );
  }

  const name = lang === "bn" && service.name_bn ? service.name_bn : service.name_en;

  return (
    <div className="min-h-screen">
      <PageHero
        pageKey="book"
        imageUrl={service.featured_image_url || undefined}
        title={lang === "bn" ? "বুকিং করুন" : "Book Service"}
        subtitle={name}
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "সেবা" : "Services", href: "/services" },
          { label: name, href: `/services/${service.slug}` },
          { label: lang === "bn" ? "বুকিং" : "Book" },
        ]}
      />

      <div className="container mx-auto px-4 max-w-2xl py-12">
        <Link
          href={`/services/${service.slug}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {lang === "bn" ? "ফিরে যান" : "Back"}
        </Link>

        <div className="card p-6 md:p-8">
          <BookingForm
            service={service}
            initialTierId={tierId}
            onSuccess={() => setBooked(true)}
          />
        </div>
      </div>
    </div>
  );
}
