import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Language } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number): string {
  return `৳${amount.toLocaleString("bn-BD")}`;
}

export function formatPriceEn(amount: number): string {
  return `৳${amount.toLocaleString("en-IN")}`;
}

export function discountPercent(original: number, current: number): number {
  return Math.round(((original - current) / original) * 100);
}

export function generateWhatsAppOrderMessage(
  customerName: string,
  phone: string,
  address: string,
  items: { name: string; price: number; qty: number }[],
  total: number,
  paymentMethod: string
): string {
  const itemLines = items
    .map((i) => `  • ${i.name} x${i.qty} = ৳${i.price * i.qty}`)
    .join("\n");

  return encodeURIComponent(
    `🛒 *নতুন অর্ডার — ABO Enterprise*\n\n` +
      `👤 নাম: ${customerName}\n` +
      `📞 ফোন: ${phone}\n` +
      `📍 ঠিকানা: ${address}\n\n` +
      `📦 *পণ্য:*\n${itemLines}\n\n` +
      `💳 পেমেন্ট: ${paymentMethod}\n` +
      `💰 *মোট: ৳${total}*\n\n` +
      `Please confirm my order. ধন্যবাদ!`
  );
}

export function generateWhatsAppBookingMessage(
  serviceType: string,
  customerName: string,
  phone: string,
  details: string
): string {
  return encodeURIComponent(
    `📋 *সেবার অনুরোধ — ABO Enterprise*\n\n` +
      `🔧 সেবা: ${serviceType}\n` +
      `👤 নাম: ${customerName}\n` +
      `📞 ফোন: ${phone}\n` +
      `📝 বিস্তারিত: ${details}\n\n` +
      `Please contact me. ধন্যবাদ!`
  );
}

export function t(key: { en: string; bn: string }, lang: Language): string {
  return lang === "bn" ? key.bn : key.en;
}

export function getBdPhoneFormat(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return `+${digits}`;
  if (digits.startsWith("0")) return `+88${digits}`;
  return `+880${digits}`;
}

export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "8801825007977";
