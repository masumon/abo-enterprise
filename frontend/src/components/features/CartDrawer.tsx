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
        className="fixed inset-0 z-50 animate-fade-in"
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col animate-slide-right"
        style={{
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "-8px 0 40px rgba(30,91,168,0.12), -2px 0 8px rgba(0,0,0,0.06)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100/80 gradient-brand">
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">
              {lang === "bn" ? "আমার কার্ট" : "My Cart"}
            </h2>
            <p className="text-white/60 text-xs mt-0.5">
              {items.length} {lang === "bn" ? "টি পণ্য" : "items"}
            </p>
          </div>
          <button
            onClick={closeCart}
            className="w-9 h-9 text-white hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 text-center">
              <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="w-10 h-10 text-brand-200" />
              </div>
              <p className="text-gray-600 font-semibold mb-1">
                {lang === "bn" ? "কার্ট খালি আছে" : "Your cart is empty"}
              </p>
              <p className="text-gray-400 text-sm mb-5">
                {lang === "bn" ? "পণ্য যোগ করুন" : "Add some products"}
              </p>
              <button onClick={closeCart} className="btn btn-brand btn-sm">
                {lang === "bn" ? "কেনাকাটা শুরু করুন" : "Start Shopping"}
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.product_id}
                className="flex gap-4 p-3.5 rounded-2xl border border-gray-100 bg-white/80 hover:border-brand-100 transition-colors"
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.name_en} width={64} height={64} className="object-cover w-full h-full" />
                  ) : (
                    <ShoppingBag className="w-7 h-7 text-brand-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">
                    {lang === "bn" ? item.name_bn : item.name_en}
                  </p>
                  <p className="text-accent-500 font-bold mt-0.5 text-sm">{formatPrice(item.price)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      className="w-7 h-7 bg-gray-100 hover:bg-brand-50 border border-gray-200 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-gray-700">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      className="w-7 h-7 bg-gray-100 hover:bg-brand-50 border border-gray-200 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeItem(item.product_id)}
                      className="ml-auto w-7 h-7 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg flex items-center justify-center transition-all"
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
          <div
            className="px-5 py-5 border-t border-gray-100"
            style={{ background: "rgba(248,250,255,0.95)" }}
          >
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">{lang === "bn" ? "ডেলিভারি" : "Delivery"}</span>
                <span className="text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full text-xs">
                  {lang === "bn" ? "ফ্রি" : "FREE"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">{lang === "bn" ? "মোট" : "Total"}</span>
                <span className="text-2xl font-bold text-accent-500">{formatPrice(cartTotal)}</span>
              </div>
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
