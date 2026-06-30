"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import CartDrawer from "@/components/features/CartDrawer";
import AssistantWidget from "@/components/ui/AssistantWidget";
import CompareBar from "@/components/ui/CompareBar";
import OfflineBanner from "@/components/ui/OfflineBanner";
import ApiWarmup from "@/components/ui/ApiWarmup";
import ToastProvider from "@/components/ui/ToastProvider";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import BackToTop from "@/components/ui/BackToTop";
import CookieConsent from "@/components/ui/CookieConsent";
import SkipToContent from "@/components/ui/SkipToContent";
import StickyCTA from "@/components/ui/StickyCTA";

export default function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <SkipToContent />
      <AnnouncementBar />
      <OfflineBanner />
      <Navbar />
      <div id="page-content" className="flex-1 pt-[var(--navbar-offset)] pb-mobile-nav lg:pb-0 min-h-screen page-surface">
        {children}
      </div>
      <Footer />
      <CartDrawer />
      <CompareBar />
      <AssistantWidget />
      <WhatsAppButton />
      <StickyCTA />
      <BackToTop />
      <CookieConsent />
      <ApiWarmup />
      <MobileBottomNav />
      <ToastProvider />
    </>
  );
}
