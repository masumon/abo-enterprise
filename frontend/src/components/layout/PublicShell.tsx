"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import CartDrawer from "@/components/features/CartDrawer";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
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
      <Navbar />
      <main className="flex-1 pt-[6.25rem] pb-20 lg:pb-0 min-h-screen" style={{ background: "var(--surface, #fafbff)" }}>
        {children}
      </main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
      <MobileBottomNav />
      <ToastProvider />
    </>
  );
}
