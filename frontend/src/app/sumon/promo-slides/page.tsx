"use client";

import PromoSlidesManager from "@/components/admin/PromoSlidesManager";

/** Hero slides only — flash-sale banners are managed in Coupons & Flash Sale. */
export default function AdminPromoSlidesPage() {
  return <PromoSlidesManager only="hero" />;
}
