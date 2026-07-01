"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import CartDrawer from "@/components/features/CartDrawer";
import AssistantWidget from "@/components/ui/AssistantWidget";
import CompareBar from "@/components/ui/CompareBar";
import ApiWarmup from "@/components/ui/ApiWarmup";
import ToastProvider from "@/components/ui/ToastProvider";
import BackToTop from "@/components/ui/BackToTop";
import CookieConsent from "@/components/ui/CookieConsent";
import SkipToContent from "@/components/ui/SkipToContent";
import StickyCTA from "@/components/ui/StickyCTA";
import DelayedMount from "@/components/ui/DelayedMount";
import FacebookPixel from "@/components/analytics/FacebookPixel";
import ScrollProgress from "@/components/ui/ScrollProgress";
import HtmlLangSync from "@/components/ui/HtmlLangSync";
import DynamicFavicon from "@/components/ui/DynamicFavicon";
import { offlineSync } from "@/lib/offlineSync";

export default function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  useEffect(() => {
    offlineSync.init().catch(() => {});
  }, []);

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <HtmlLangSync />
      <DynamicFavicon />
      <ScrollProgress />
      <SkipToContent />
      <AnnouncementBar />
      <Navbar />
      <div id="page-content" className="flex-1 pt-[var(--navbar-offset)] pb-mobile-nav lg:pb-0 min-h-screen page-surface">
        {children}
      </div>
      <Footer />
      <CartDrawer />
      <CompareBar />
      <DelayedMount delayMs={5000}>
        <AssistantWidget />
      </DelayedMount>
      <FacebookPixel />
      <StickyCTA />
      <BackToTop />
      <DelayedMount delayMs={4000}>
        <CookieConsent />
      </DelayedMount>
      <ApiWarmup />
      <MobileBottomNav />
      <ToastProvider />
    </>
  );
}
