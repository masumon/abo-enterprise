"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useCartStore } from "@/store/cart";
import ProductCard from "@/components/features/ProductCard";
import type { Product } from "@/types";

const FEATURED_PRODUCTS: Product[] = [
  {
    id: "1",
    slug: "phone-case-premium",
    name_en: "Premium Phone Case",
    name_bn: "প্রিমিয়াম ফোন কেস",
    price: 299,
    original_price: 500,
    category: "accessories",
    badge: "HOT",
    stock_quantity: 50,
    is_active: true,
    is_featured: true,
  },
  {
    id: "2",
    slug: "fast-charger-65w",
    name_en: "Fast Charger 65W",
    name_bn: "ফাস্ট চার্জার ৬৫W",
    price: 599,
    original_price: 800,
    category: "accessories",
    badge: "SALE",
    stock_quantity: 30,
    is_active: true,
    is_featured: true,
  },
  {
    id: "3",
    slug: "earbuds-tws-pro",
    name_en: "Earbuds TWS Pro",
    name_bn: "ওয়্যারলেস ইয়ারবাড প্রো",
    price: 999,
    original_price: 1500,
    category: "gadgets",
    badge: "NEW",
    stock_quantity: 20,
    is_active: true,
    is_featured: true,
  },
  {
    id: "4",
    slug: "power-bank-20000",
    name_en: "Power Bank 20000mAh",
    name_bn: "পাওয়ার ব্যাংক ২০০০০mAh",
    price: 1299,
    category: "gadgets",
    stock_quantity: 15,
    is_active: true,
    is_featured: true,
  },
  {
    id: "5",
    slug: "glass-protector",
    name_en: "Tempered Glass Protector",
    name_bn: "টেম্পার্ড গ্লাস প্রটেক্টর",
    price: 250,
    category: "accessories",
    stock_quantity: 100,
    is_active: true,
    is_featured: true,
  },
  {
    id: "6",
    slug: "type-c-cable-3m",
    name_en: "Type-C Cable 3M Braided",
    name_bn: "টাইপ-সি ব্রেডেড ক্যাবল ৩M",
    price: 199,
    category: "accessories",
    stock_quantity: 200,
    is_active: true,
    is_featured: false,
  },
  {
    id: "7",
    slug: "car-holder-magnetic",
    name_en: "Magnetic Car Holder",
    name_bn: "ম্যাগনেটিক কার হোল্ডার",
    price: 399,
    category: "accessories",
    stock_quantity: 40,
    is_active: true,
    is_featured: false,
  },
  {
    id: "8",
    slug: "bt-speaker-waterproof",
    name_en: "Waterproof BT Speaker",
    name_bn: "ওয়াটারপ্রুফ স্পিকার",
    price: 1499,
    original_price: 2000,
    category: "gadgets",
    stock_quantity: 10,
    is_active: true,
    is_featured: false,
  },
];

export default function FeaturedProducts() {
  const { lang } = useLanguageStore();
  const { openCart } = useCartStore();

  return (
    <section id="products" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="section-title text-center mb-10">
          <h2>{lang === "bn" ? "জনপ্রিয় পণ্য" : "Featured Products"}</h2>
          <div className="section-divider" />
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            {lang === "bn"
              ? "সেরা মানের মোবাইল এক্সেসরিজ ও গ্যাজেট — সরাসরি আপনার দোরগোড়ায়"
              : "Best quality mobile accessories and gadgets — delivered right to your door"}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {FEATURED_PRODUCTS.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={openCart}
            />
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/products" className="btn btn-outline btn-lg">
            {lang === "bn" ? "সব পণ্য দেখুন" : "View All Products"}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
