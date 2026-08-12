import { calcAdvanceCharge, calcDeliveryCharge, getWhatsAppNumber } from "@/lib/checkoutHelpers";

describe("checkout runtime settings", () => {
  const settings = {
    free_delivery_min_amount: "2500",
    delivery_charge_sylhet: "75",
    delivery_charge_dhaka: "125",
    delivery_charge_outside: "140",
    advance_delivery_charge: "300",
    whatsapp_number: "01712345678",
  };

  it("uses configured delivery values and does not invent a fallback", () => {
    expect(calcDeliveryCharge("Sylhet", 3000, settings)).toBe(0);
    expect(calcDeliveryCharge("Sylhet", 1000, settings)).toBe(75);
    expect(calcDeliveryCharge("Dhaka", 1000, settings)).toBe(125);
    expect(calcDeliveryCharge("Rajshahi", 1000, settings)).toBe(140);
    expect(calcDeliveryCharge("Sylhet", 1000, {})).toBeNull();
  });

  it("returns null for a required advance amount when the setting is missing", () => {
    expect(calcAdvanceCharge([{ requires_advance: true }], settings)).toBe(300);
    expect(calcAdvanceCharge([{ requires_advance: true }], {})).toBeNull();
    expect(calcAdvanceCharge([{ requires_advance: false }], {})).toBe(0);
  });

  it("does not fabricate a WhatsApp number", () => {
    expect(getWhatsAppNumber(settings)).toBe("01712345678");
    expect(getWhatsAppNumber({})).toBe("");
  });
});
