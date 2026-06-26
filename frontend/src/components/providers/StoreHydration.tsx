"use client";

import { useEffect } from "react";
import { useLanguageStore } from "@/store/language";
import { useCartStore } from "@/store/cart";

export default function StoreHydration() {
  useEffect(() => {
    useLanguageStore.persist.rehydrate();
    useCartStore.persist.rehydrate();
  }, []);

  return null;
}
