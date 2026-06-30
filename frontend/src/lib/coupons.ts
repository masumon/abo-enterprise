import { couponsApi } from "@/lib/api";

export interface AppliedCoupon {
  code: string;
  discountRate: number;
  discountAmount: number;
}

const FALLBACK_COUPONS: Record<string, number> = { ABO10: 0.1, WELCOME: 0.05 };

export async function validateCoupon(code: string, subtotal: number): Promise<AppliedCoupon> {
  const normalized = code.trim().toUpperCase();
  try {
    const res = await couponsApi.validate(normalized, subtotal);
    const data = res.data.data;
    if (!data) throw new Error("Invalid");
    return {
      code: data.code,
      discountRate: data.discount_rate,
      discountAmount: data.discount_amount,
    };
  } catch {
    const rate = FALLBACK_COUPONS[normalized];
    if (!rate) throw new Error("Invalid coupon");
    return {
      code: normalized,
      discountRate: rate,
      discountAmount: Math.round(subtotal * rate),
    };
  }
}

export function fallbackCouponRate(code: string): number {
  return FALLBACK_COUPONS[code.trim().toUpperCase()] ?? 0;
}
