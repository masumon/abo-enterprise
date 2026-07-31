import { couponsApi } from "@/lib/api";

export interface AppliedCoupon {
  code: string;
  discountRate: number;
  discountAmount: number;
}

const FALLBACK_COUPONS: Record<string, number> = { ABO10: 0.1, WELCOME: 0.05 };

export async function validateCoupon(code: string, subtotal: number): Promise<AppliedCoupon> {
  const normalized = code.trim().toUpperCase();
  const res = await couponsApi.validate(normalized, subtotal);
  const data = res.data.data;
  if (!data) {
    // Provide actionable error reasons
    const error = res.data.error || "Invalid coupon";
    if (error.toLowerCase().includes("not found")) {
      throw new Error("Coupon does not exist");
    } else if (error.toLowerCase().includes("expired")) {
      throw new Error("Coupon has expired");
    } else if (error.toLowerCase().includes("minimum")) {
      throw new Error("Order total is below minimum amount");
    } else if (error.toLowerCase().includes("used")) {
      throw new Error("Coupon has already been used");
    }
    throw new Error(error);
  }
  return {
    code: data.code,
    discountRate: data.discount_rate,
    discountAmount: data.discount_amount,
  };
}

export function fallbackCouponRate(code: string): number {
  return FALLBACK_COUPONS[code.trim().toUpperCase()] ?? 0;
}
