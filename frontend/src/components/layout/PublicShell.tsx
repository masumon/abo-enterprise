"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import ToastProvider from "@/components/ui/ToastProvider";
import SkipToContent from "@/components/ui/SkipToContent";
import DelayedMount from "@/components/ui/DelayedMount";
import FacebookPixel from "@/components/analytics/FacebookPixel";
import GoogleTagManager from "@/components/analytics/GoogleTagManager";
import GscVerification from "@/components/analytics/GscVerification";
import HtmlLangSync from "@/components/ui/HtmlLangSync";
import DynamicFavicon from "@/components/ui/DynamicFavicon";
import { offlineSync } from "@/lib/offlineSync";
import dynamic from "next/dynamic";

// Not needed for the first paint — loaded after it so phones get a smaller first bundle.
const CartDrawer = dynamic(() => import("@/components/features/CartDrawer"), { ssr: false });
const AssistantWidget = dynamic(() => import("@/components/ui/AssistantWidget"), { ssr: false });
const CompareBar = dynamic(() => import("@/components/ui/CompareBar"), { ssr: false });
const BackToTop = dynamic(() => import("@/components/ui/BackToTop"), { ssr: false });
const CookieConsent = dynamic(() => import("@/components/ui/CookieConsent"), { ssr: false });
const StickyCTA = dynamic(() => import("@/components/ui/StickyCTA"), { ssr: false });
const ScrollProgress = dynamic(() => import("@/components/ui/ScrollProgress"), { ssr: false });
const OfflineSubmissionBadge = dynamic(() => import("@/components/network/OfflineSubmissionBadge"), { ssr: false });

export default function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/sumon") ?? false;

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
      {/* Desktop only — mobile shows the same data as an in-header ticker
          (Navbar.tsx), since there's no free space between logo and toggle
          on mobile once the strip's own row is removed there. */}
      <div className="hidden lg:block">
        <AnnouncementBar />
      </div>
      <Navbar />
      <main id="page-content" className="flex-1 pt-[var(--navbar-offset)] pb-mobile-nav lg:pb-0 min-h-screen page-surface">
        {children}
      </main>
      <Footer />
      <CartDrawer />
      <CompareBar />
      <DelayedMount delayMs={5000}>
        <AssistantWidget />
      </DelayedMount>
      <FacebookPixel />
      <GoogleTagManager />
      <GscVerification />
      <StickyCTA />
      <BackToTop />
      <DelayedMount delayMs={4000}>
        <CookieConsent />
      </DelayedMount>
      <OfflineSubmissionBadge />
      <MobileBottomNav />
      <ToastProvider />
    </>
  );
}
