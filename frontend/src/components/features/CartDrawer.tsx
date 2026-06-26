"use client";

import { useState } from "react";
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useCartStore } from "@/store/cart";
import { useLanguageStore } from "@/store/language";
import { formatPrice, generateWhatsAppOrderMessage, WHATSAPP_NUMBER } from "@/lib/utils";
import { cn } from "@/lib/utils";
import CheckoutModal from "./CheckoutModal";

export default function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, total } = useCartStore();
  const { lang } = useLanguageStore();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const cartTotal = total();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 gradient-brand">
          <h2 className="text-white font-bold text-lg">
            {lang === "bn" ? "আমার কার্ট" : "My Cart"}
          </h2>
          <button
            onClick={closeCart}
            className="w-9 h-9 text-white hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <ShoppingBag className="w-16 h-16 text-gray-200 mb-4" />
              <p className="text-gray-500 font-medium">
                {lang === "bn" ? "কার্ট খালি আছে" : "Your cart is empty"}
              </p>
              <button
                onClick={closeCart}
                className="mt-4 btn btn-brand btn-sm"
              >
                {lang === "bn" ? "কেনাকাটা শুরু করুন" : "Start Shopping"}
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.product_id} className="flex gap-4 p-3 rounded-xl border border-gray-100 bg-gray-50">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.name_en} width={64} height={64} className="object-cover w-full h-full" />
                  ) : (
                    <ShoppingBag className="w-7 h-7 text-brand-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">
                    {lang === "bn" ? item.name_bn : item.name_en}
                  </p>
                  <p className="text-accent-500 font-bold mt-0.5">{formatPrice(item.price)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      className="w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      className="w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeItem(item.product_id)}
                      className="ml-auto w-7 h-7 text-red-400 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-gray-100 bg-gray-50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-500">
                {lang === "bn" ? "ডেলিভারি" : "Delivery"}
              </span>
              <span className="text-sm text-green-600 font-semibold">
                {lang === "bn" ? "ফ্রি" : "FREE"}
              </span>
            </div>
            <div className="flex justify-between items-center mb-5">
              <span className="font-bold text-gray-900">
                {lang === "bn" ? "মোট" : "Total"}
              </span>
              <span className="text-xl font-bold text-accent-500">{formatPrice(cartTotal)}</span>
            </div>
            <button
              onClick={() => { closeCart(); setCheckoutOpen(true); }}
              className="btn btn-primary btn-lg w-full"
            >
              {lang === "bn" ? "অর্ডার করুন" : "Checkout"}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </aside>

      {checkoutOpen && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
        />
      )}
    </>
  );
}
