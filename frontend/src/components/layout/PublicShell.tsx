"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import CartDrawer from "@/components/features/CartDrawer";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import CompareBar from "@/components/ui/CompareBar";
import OfflineBanner from "@/components/ui/OfflineBanner";
import ApiWarmup from "@/components/ui/ApiWarmup";
import ToastProvider from "@/components/ui/ToastProvider";

export default function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <AnnouncementBar />
      <OfflineBanner />
      <Navbar />
      <div id="page-content" className="flex-1 pt-[var(--navbar-offset)] pb-mobile-nav lg:pb-0 min-h-screen page-surface">
        {children}
      </div>
      <Footer />
      <CartDrawer />
      <CompareBar />
      <WhatsAppButton />
      <ApiWarmup />
      <MobileBottomNav />
      <ToastProvider />
    </>
  );
}
